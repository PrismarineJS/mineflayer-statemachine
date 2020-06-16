class Graph
{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        this.repaint = true;
        requestAnimationFrame(() => this.animation());
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
}

function init()
{
    const canvas = document.getElementById('graph');
    const graph = new Graph(canvas);
}