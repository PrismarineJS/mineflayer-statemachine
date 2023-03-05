const NODE_CORNER_RADIUS = 8
const NODE_COLOR = '#552222'
const NODE_BORDER_COLOR = '#555555'
const NODE_HIGHLIGHT_COLOR = '#777777'
const NODE_WIDTH = 150
const NODE_HEIGHT = 75
const NODE_TEXT_FONT = '12px Calibri'
const NODE_TEXT_COLOR = '#CCCCCC'
const NODE_ACTIVE_COLOR = '#556699'
const LINE_COLOR = '#555555'
const LINE_THICKNESS = 5
const LINE_SEPARATION = 16
const LINE_HIGHLIGHT = '#888888'
const LINE_TEXT_FONT = '12px Calibri'
const LAYER_ENTER_COLOR = '#559966'

let graph
let nestedGroups

class Graph {
  constructor (canvas) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height

    this.activeLayer = 0

    this.states = []
    this.transitions = []
    this.nestedGroups = []

    this.subscribeEvents()

    this.repaint = true
    requestAnimationFrame(() => this.animation())
  }

  clear () {
    this.states = []
    this.transitions = []
    this.repaint = true
  }

  subscribeEvents () {
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e))
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e))
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e))
  }

  needsRepaint () {
    if (this.repaint) { return true }

    if (this.canvas.clientWidth !== this.width ||
            this.canvas.clientHeight !== this.height) { return true }

    return false
  }

  animation () {
    if (this.needsRepaint()) {
      this.repaint = false
      this.drawScene()
    }

    requestAnimationFrame(() => this.animation())
  }

  drawScene () {
    this.width = this.canvas.width = this.canvas.clientWidth
    this.height = this.canvas.height = this.canvas.clientHeight

    const ctx = this.canvas.getContext('2d')
    this.drawBackground(ctx)

    for (const state of this.states) { state.drawActive(ctx) }

    for (const trans of this.transitions) { trans.draw(ctx) }

    for (const state of this.states) { state.draw(ctx) }

    for (const trans of this.transitions) { trans.drawHover(ctx) }
  }

  drawBackground (ctx) {
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.lineWidth = 1
    ctx.strokeStyle = '#242424'
    this.renderGrid(ctx, 25)

    ctx.strokeStyle = '#363636'
    this.renderGrid(ctx, 100)
  }

  eventPos (event) {
    const elem = this.canvas
    let top = 0
    let left = 0

    if (elem.getClientRects().length) {
      const rect = elem.getBoundingClientRect()
      const win = elem.ownerDocument.defaultView

      top = rect.top + win.pageYOffset
      left = rect.left + win.pageXOffset
    }

    return {
      x: event.pageX - left,
      y: event.pageY - top
    }
  }

  renderGrid (ctx, step) {
    for (let x = 0; x < this.width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.closePath()
      ctx.stroke()
    }

    for (let y = 0; y < this.height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  onMouseMove (event) {
    event.preventDefault()
    const { x, y } = this.eventPos(event)

    this.updateDrag(x, y)
    this.updateHover(x, y)
  }

  updateDrag (x, y) {
    if (!this.drag) { return }

    this.drag.target.rect.x = x - this.drag.mouseX + this.drag.startX
    this.drag.target.rect.y = y - this.drag.mouseY + this.drag.startY
    this.repaint = true
  }

  updateHover (x, y) {
    const mousePos = { x: x, y: y }

    for (const state of this.states) {
      const mousedOver = state.isInBounds(x, y)

      if (mousedOver !== state.highlight) {
        state.highlight = mousedOver
        this.repaint = true
      }
    }

    for (const trans of this.transitions) {
      const mousedOver = trans.isInBounds(x, y)

      if (mousedOver !== trans.highlight) {
        trans.highlight = mousedOver
        this.repaint = true
      }

      if (mousedOver) {
        trans.mousePos = mousePos
        this.repaint = true
      }
    }
  }

  onMouseDown (event) {
    event.preventDefault()
    const { x, y } = this.eventPos(event)

    let targetState
    for (const state of this.states) {
      if (state.isInBounds(x, y)) { targetState = state }
    }

    if (!targetState) { return }

    this.drag = {
      target: targetState,
      startX: targetState.rect.x,
      startY: targetState.rect.y,
      mouseX: x,
      mouseY: y
    }
  }

  onMouseUp (event) {
    event.preventDefault()
    this.drag = null
  }
}

class Rect {
  constructor (x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  cx () {
    return this.x + this.w / 2
  }

  cy () {
    return this.y + this.h / 2
  }
}

class State {
  constructor (id, name, rect, layer) {
    this.id = id
    this.name = name
    this.rect = rect
    this.layer = layer
    this.highlight = false
    this.activeState = false
    this.enterState = false
    this.exitState = false
  }

  draw (ctx) {
    if (this.layer !== graph.activeLayer) { return }

    this.fillNodePath(ctx)

    ctx.fillStyle = this.enterState ? LAYER_ENTER_COLOR : NODE_COLOR
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = this.highlight ? NODE_HIGHLIGHT_COLOR : NODE_BORDER_COLOR
    ctx.stroke()

    ctx.fillStyle = NODE_TEXT_COLOR
    ctx.font = NODE_TEXT_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.name, this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2)
  }

  drawActive (ctx) {
    if (this.layer !== graph.activeLayer) { return }

    if (!this.activeState) { return }

    this.fillNodePath(ctx, 8)
    ctx.lineWidth = 3
    ctx.strokeStyle = NODE_ACTIVE_COLOR
    ctx.stroke()
  }

  fillNodePath (ctx, buffer = 0) {
    const x = this.rect.x - buffer
    const y = this.rect.y - buffer
    const w = this.rect.w + buffer * 2
    const h = this.rect.h + buffer * 2
    const r = NODE_CORNER_RADIUS + buffer

    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  isInBounds (x, y) {
    if (this.layer !== graph.activeLayer) {
      return false
    }

    const r = NODE_CORNER_RADIUS

    return x >= this.rect.x - r && x < this.rect.x + this.rect.w + r && y >= this.rect.y - r &&
            y < this.rect.y + this.rect.h + r
  }
}

class TransitionGroup {
  constructor (parent, child) {
    this.parent = parent
    this.child = child
    this.transitions = []
  }

  offset (transition) {
    const index = this.transitions.indexOf(transition)

    const dir =
        {
          x: this.parent.rect.cx() - this.child.rect.cx(),
          y: this.parent.rect.cy() - this.child.rect.cy()
        }

    this.rotateDir(dir, Math.PI / 2)
    this.normalizeDir(dir)

    const str = ((index + 0.5) - this.transitions.length / 2) * LINE_SEPARATION

    return {
      x: dir.x * str,
      y: dir.y * str,
      dirX: dir.x,
      dirY: dir.y
    }
  }

  rotateDir (p, angle) {
    const s = Math.sin(angle)
    const c = Math.cos(angle)

    const x = p.x * c - p.y * s
    const y = p.x * s + p.y * c

    p.x = x
    p.y = y
  }

  normalizeDir (dir) {
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    dir.x /= mag
    dir.y /= mag
  }
}

class Transition {
  constructor (id, name, parent, child, group) {
    this.id = id
    this.name = name
    this.parent = parent
    this.child = child
    this.group = group
    this.highlight = false

    group.transitions.push(this)
  }

  draw (ctx) {
    if (this.parent.layer !== graph.activeLayer ||
            this.child.layer !== graph.activeLayer) { return }

    const offset = this.group.offset(this)

    const a =
        {
          x: this.parent.rect.cx() + offset.x,
          y: this.parent.rect.cy() + offset.y
        }

    const b =
        {
          x: this.child.rect.cx() + offset.x,
          y: this.child.rect.cy() + offset.y
        }

    this.clipArrow(this.child.rect, a, b)
    const arrow = this.arrowBase(a, b)

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(arrow.x, arrow.y)
    ctx.closePath()

    ctx.lineWidth = LINE_THICKNESS
    ctx.strokeStyle = this.highlight ? LINE_HIGHLIGHT : LINE_COLOR
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(arrow.x + offset.dirX * arrow.size, arrow.y + offset.dirY * arrow.size)
    ctx.lineTo(arrow.x - offset.dirX * arrow.size, arrow.y - offset.dirY * arrow.size)
    ctx.lineTo(b.x, b.y)
    ctx.closePath()

    ctx.fillStyle = this.highlight ? LINE_HIGHLIGHT : LINE_COLOR
    ctx.fill()
  }

  drawHover (ctx) {
    if (this.parent.layer !== graph.activeLayer ||
            this.child.layer !== graph.activeLayer) { return }

    if (!this.highlight || !this.name) { return }

    ctx.fillStyle = NODE_TEXT_COLOR
    ctx.font = LINE_TEXT_FONT
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.name, this.mousePos.x, this.mousePos.y - 10)
  }

  isInBounds (x, y) {
    if (this.parent.layer !== graph.activeLayer ||
            this.child.layer !== graph.activeLayer) { return false }

    function sqr (x) { return x * x }
    function dist2 (v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
    function distToSegmentSquared (p, v, w) {
      const l2 = dist2(v, w)
      if (l2 === 0) return dist2(p, v)
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
      t = Math.max(0, Math.min(1, t))
      return dist2(p, {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y)
      })
    }
    function distToSegment (p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)) }

    const offset = this.group.offset(this)

    const a =
        {
          x: this.parent.rect.cx() + offset.x,
          y: this.parent.rect.cy() + offset.y
        }

    const b =
        {
          x: this.child.rect.cx() + offset.x,
          y: this.child.rect.cy() + offset.y
        }

    this.clipArrow(this.child.rect, a, b)
    this.clipArrow(this.parent.rect, b, a)
    return distToSegment({ x: x, y: y }, a, b) <= LINE_THICKNESS
  }

  arrowBase (a, b) {
    const dir = { x: b.x - a.x, y: b.y - a.y }
    const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    dir.x /= mag
    dir.y /= mag

    const arrowSize = LINE_THICKNESS * 2

    return {
      x: b.x - dir.x * arrowSize * 2,
      y: b.y - dir.y * arrowSize * 2,
      size: arrowSize
    }
  }

  clipArrow (rect, a, b) {
    const intersect = this.liangBarskyClipper(
      rect.x, rect.y, rect.x + rect.w, rect.y + rect.h,
      a.x, a.y,
      b.x, b.y)

    b.x = intersect.x
    b.y = intersect.y
  }

  liangBarskyClipper (xmin, ymin, xmax, ymax, x1, y1, x2, y2) {
    const p1 = -(x2 - x1)
    const p2 = -p1
    const p3 = -(y2 - y1)
    const p4 = -p3

    let n1 = 0
    let n2 = 0

    if (p1 !== 0) {
      if (p1 < 0) { n1 = (x1 - xmin) / p1 } else { n1 = (xmax - x1) / p2 }
    }

    if (p3 !== 0) {
      if (p3 < 0) { n2 = (y1 - ymin) / p3 } else { n2 = (ymax - y1) / p4 }
    }

    const rn = Math.max(0, n1, n2)
    return {
      x: x1 + p2 * rn,
      y: y1 + p4 * rn
    }
  }
}

class NestedGroup {
  constructor (id, indent, enter, exit) {
    this.id = id
    this.indent = indent
    this.enter = enter
    this.exit = exit
  }
}

function init () {
  const canvas = document.getElementById('graph')
  graph = new Graph(canvas)
  nestedGroups = []

  const socket = io()
  socket.on('connected', packet => onConnected(packet))
  socket.on('stateChanged', packet => onStateChanged(packet))
}

function onConnected (packet) {
  console.log('Bot connected.')

  graph.clear()
  loadNestedGroups(packet)
  loadStates(packet)
  loadTransitions(packet)
  graph.repaint = true
}

function loadStates (packet) {
  const centerX = graph.width / 2 - NODE_WIDTH / 2
  const centerY = graph.height / 2 - NODE_HEIGHT / 2
  const radiusX = graph.width / 3
  const radiusY = graph.height / 3

  let index = 0
  for (const state of packet.states) {
    const angle = (index / packet.states.length) * Math.PI * 2
    index++

    let startX
    let startY

    if (state.x != null || state.y != null) {
        startX = state.x
        startY = state.y
    } else {
        startX = centerX + Math.cos(angle) * radiusX
        startY = centerY + Math.sin(angle) * radiusY
    }

    const rect = new Rect(
      startX,
      startY,
      NODE_WIDTH,
      NODE_HEIGHT
    )

    const stateNode = new State(state.id, state.name, rect, state.nestGroup)
    stateNode.activeState = false
    stateNode.enterState = graph.nestedGroups[state.nestGroup].enter === state.id
    stateNode.exitState = graph.nestedGroups[state.nestGroup].exit === state.id
    stateNode.nestedGroup = state.nestGroup

    graph.states.push(stateNode)
  }
}

function loadTransitions (packet) {
  const groups = []

  for (const transition of packet.transitions) {
    const parent = graph.states[transition.parentState]
    const child = graph.states[transition.childState]
    const group = getTransitionGroup(groups, parent, child)

    const t = new Transition(transition.id, transition.name, parent, child, group)
    graph.transitions.push(t)
  }
}

function loadNestedGroups (packet) {
  const buttonGroup = document.getElementById('layerButtons')

  for (const n of packet.nestGroups) {
    const g = new NestedGroup(n.id, n.indent, n.enter, n.exit)
    graph.nestedGroups.push(g)

    const button = document.createElement('button')
    button.innerHTML = n.name || 'unnamed layer'
    button.id = `nestedLayer${n.id}`
    button.setAttribute('idnested', n.id)
    button.addEventListener('click', () => selectLayer(n.id, button))

    if (n.indent > 0) { button.classList.add(`nested${n.indent}`) } else { button.classList.add('selected') }

    buttonGroup.appendChild(button)
    nestedGroups.push(button)
  }
}

function getTransitionGroup (groups, parent, child) {
  // To make group order ambiguous
  if (parent.id < child.id) {
    return getTransitionGroup(groups, child, parent)
  }

  for (const group of groups) {
    if (group.parent === parent && group.child === child) { return group }
  }

  const group = new TransitionGroup(parent, child)
  groups.push(group)

  return group
}

function onStateChanged (packet) {
  console.log(`Bot behavior states changed to ${packet.activeStates}.`)

  for (const state of graph.states) { state.activeState = packet.activeStates.includes(state.id) }
  const activeNestedGroups = graph.states.filter(state => packet.activeStates.includes(state.id)).map(i => i.nestedGroup)
  reprintNestedGroups(activeNestedGroups)

  graph.repaint = true
}

function reprintNestedGroups(activeNestedGroups){
  nestedGroups.forEach(button => {
    if(activeNestedGroups.includes(parseInt(button.getAttribute('idnested')))){
      button.classList.add('running')
    }else{
      button.classList.remove('running')
    }
  })
}

function selectLayer (layer, newLayerButton) {
  const oldLayerButton = document.getElementById(`nestedLayer${graph.activeLayer}`)
  oldLayerButton.classList.remove('selected')

  graph.activeLayer = layer
  graph.repaint = true

  newLayerButton.classList.add('selected')

  console.log(`Selected layer ${layer}`)
}
