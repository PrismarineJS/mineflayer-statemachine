const NODE_CORNER_RADIUS = 8;
const NODE_COLOR = '#552222';
const NODE_BORDER_COLOR = '#555555';
const NODE_HIGHLIGHT_COLOR = '#777777';
const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;
const NODE_TEXT_FONT = '12px Calibri';
const NODE_TEXT_COLOR = '#CCCCCC';
const NODE_ACTIVE_COLOR = '#559966';
const NODE_INIT_COLOR = '#556699';
const LINE_COLOR = '#AAAAAA';
const LINE_THICKNESS = 3;
const LINE_SEPARATION = 10;

class Graph
{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        this.states = [];
        this.transitions = [];

        this.subscribeEvents();

        this.repaint = true;
        requestAnimationFrame(() => this.animation());
    }

    subscribeEvents()
    {
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    }

    needsRepaint()
    {
        if (this.repaint)
            return true;
        
        if (this.canvas.clientWidth != this.width
            || this.canvas.clientHeight != this.height)
            return true;
        
        return false;
    }

    animation()
    {
        if (this.needsRepaint())
        {
            this.repaint = false;
            this.drawScene();
        }
        
        requestAnimationFrame(() => this.animation());
    }

    drawScene()
    {
        this.width = this.canvas.width = this.canvas.clientWidth;
        this.height = this.canvas.height = this.canvas.clientHeight;

        let ctx = this.canvas.getContext('2d');
        this.drawBackground(ctx);

        for (let trans of this.transitions)
            trans.draw(ctx);

        for (let state of this.states)
            state.draw(ctx);
    }

    drawBackground(ctx)
    {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#242424';
        this.renderGrid(ctx, 25);

        ctx.strokeStyle = '#363636';
        this.renderGrid(ctx, 100);
    }

    eventPos(event)
    {
        let elem = this.canvas;
        let top = 0;
        let left = 0;

        if (elem.getClientRects().length)
        {
            let rect = elem.getBoundingClientRect();
            let win = elem.ownerDocument.defaultView;

            top = rect.top + win.pageYOffset;
            left = rect.left + win.pageXOffset;
        }

        return {
            x: event.pageX - left,
            y: event.pageY - top
        };
    }

    renderGrid(ctx, step)
    {
        for (let x = 0; x < this.width; x += step)
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.closePath();
            ctx.stroke();
        }

        for (let y = 0; y < this.height; y += step)
        {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    onMouseMove(event)
    {
        event.preventDefault();
        const { x, y } = this.eventPos(event);

        this.updateDrag(x, y);
        this.updateHover(x, y)
    }

    updateDrag(x, y)
    {
        if (!this.drag)
            return;
        
        this.drag.target.rect.x = x - this.drag.mouseX + this.drag.startX;
        this.drag.target.rect.y = y - this.drag.mouseY + this.drag.startY;
        this.repaint = true;
    }

    updateHover(x, y)
    {
        for (let state of this.states)
        {
            let mousedOver = state.isInBounds(x, y);

            if (mousedOver != state.highlight)
            {
                state.highlight = mousedOver;
                this.repaint = true;
            }
        }
    }

    onMouseDown(event)
    {
        event.preventDefault();
        const { x, y } = this.eventPos(event);

        let targetState;
        for (let state of this.states)
        {
            if (state.isInBounds(x, y))
                targetState = state;
        }

        if (!targetState)
            return;

        this.drag = {
            target: targetState,
            startX: targetState.rect.x,
            startY: targetState.rect.y,
            mouseX: x,
            mouseY: y
        };
    }

    onMouseUp(event)
    {
        event.preventDefault();
        this.drag = null;
    }
}

class Rect
{
    constructor(x, y, w, h)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    cx()
    {
        return this.x + this.w / 2;
    }

    cy()
    {
        return this.y + this.h / 2;
    }
}

class State
{
    constructor(id, name, rect)
    {
        this.id = id;
        this.name = name;
        this.rect = rect;
        this.highlight = false;
        this.activeState = false;
        this.initialState = false;
    }

    draw(ctx)
    {
        this.fillNodePath(ctx);

        ctx.fillStyle = this.initialState ? NODE_INIT_COLOR : NODE_COLOR;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = this.highlight ? NODE_HIGHLIGHT_COLOR : NODE_BORDER_COLOR;
        ctx.stroke();

        if (this.activeState)
        {
            this.fillNodePath(ctx, 8);
            ctx.lineWidth = 3;
            ctx.strokeStyle = NODE_ACTIVE_COLOR;
            ctx.stroke();
        }

        ctx.fillStyle = NODE_TEXT_COLOR;
        ctx.font = NODE_TEXT_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2);
    }

    fillNodePath(ctx, buffer = 0)
    {
        const x = this.rect.x - buffer;
        const y = this.rect.y - buffer;
        const w = this.rect.w + buffer * 2;
        const h = this.rect.h + buffer * 2;
        const r = NODE_CORNER_RADIUS + buffer;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    isInBounds(x, y)
    {
        const r = NODE_CORNER_RADIUS;

        return x >= this.rect.x - r && x < this.rect.x + this.rect.w + r && y >= this.rect.y - r
            && y < this.rect.y + this.rect.h + r;
    }
}

class TransitionGroup
{
    constructor(parent, child)
    {
        this.parent = parent;
        this.child = child;
        this.transitions = [];
    }

    offset(transition)
    {
        let index = this.transitions.indexOf(transition);

        const dir =
        {
            x: this.parent.rect.cx() - this.child.rect.cx(),
            y: this.parent.rect.cy() - this.child.rect.cy(),
        }

        this.rotateDir(dir, Math.PI / 2);
        this.normalizeDir(dir);

        const str = (index - this.transitions.length / 2) * LINE_SEPARATION;

        return {
            x: dir.x * str,
            y: dir.y * str,
        }
    }

    rotateDir(p, angle)
    {
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        const x = p.x * c - p.y * s;
        const y = p.x * s + p.y * c;

        p.x = x;
        p.y = y;
    }

    normalizeDir(dir)
    {
        const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        dir.x /= mag;
        dir.y /= mag;
    }
}

class Transition
{
    constructor(id, parent, child, group)
    {
        this.id = id;
        this.parent = parent;
        this.child = child;
        this.group = group;

        group.transitions.push(this);
    }

    draw(ctx)
    {
        const offset = this.group.offset(this);

        const a =
        {
            x: this.parent.rect.cx() + offset.x,
            y: this.parent.rect.cy() + offset.y,
        }

        const b =
        {
            x: this.child.rect.cx() + offset.x,
            y: this.child.rect.cy() + offset.y,
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        ctx.lineWidth = LINE_THICKNESS;
        ctx.strokeStyle = LINE_COLOR;
        ctx.stroke();
    }
}

function init()
{
    const canvas = document.getElementById('graph');
    const graph = new Graph(canvas);

    const socket = io();
    socket.on("connected", packet => onConnected(packet, graph));
    socket.on("stateChanged", packet => onStateChanged(packet, graph));
    socket.on("disconnect", () => onDisconnected(graph));
}

function onConnected(packet, graph)
{
    console.log("Bot connected.");

    loadStates(packet, graph);
    loadTransitions(packet, graph);
    graph.repaint = true;
}

function loadStates(packet, graph)
{
    const centerX = graph.width / 2 - NODE_WIDTH / 2;
    const centerY = graph.height / 2 - NODE_HEIGHT / 2;
    const radiusX = graph.width / 3;
    const radiusY = graph.height / 3;

    let index = 0;
    for (let state of packet.states)
    {
        const angle = (index / packet.states.length) * Math.PI;
        index++;

        const rect = new Rect(
            centerX + Math.cos(angle) * radiusX,
            centerY + Math.sin(angle) * radiusY,
            NODE_WIDTH,
            NODE_HEIGHT
        );

        const stateNode = new State(state.id, state.name, rect);
        stateNode.activeState = packet.activeState === state.id;
        stateNode.initialState = packet.initialState === state.id;

        graph.states.push(stateNode);
    }
}

function loadTransitions(packet, graph)
{
    const groups = [];

    for (let transition of packet.transitions)
    {
        const parent = graph.states[transition.parentState];
        const child = graph.states[transition.childState];
        const group = getTransitionGroup(groups, parent, child);

        const t = new Transition(transition.id, parent, child, group);
        graph.transitions.push(t);
    }
}

function getTransitionGroup(groups, parent, child)
{
    if (parent.id < child.id) // To make groups order ambiguous
        return getTransitionGroup(groups, child, parent);
    
    for (let group of groups)
    {
        if (group.parent === parent && group.child === child)
            return group;
    }

    const group = new TransitionGroup(parent, child);
    groups.push(group);

    return group;
}

function onStateChanged(packet, graph)
{
    console.log(`Bot behavior state changed to ${packet.activeState}.`);

    for (let state of graph.states)
    {
        state.activeState = packet.activeState === state.id;
        graph.repaint = true;
    }
}

function onDisconnected(graph)
{
    console.log("Bot disconnected.");
}
