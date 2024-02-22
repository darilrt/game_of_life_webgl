var gl, webg_canvas;
var framebuffer = {
    fbo1: null,
    texture1: null,
    fbo2: null,
    texture2: null,
};
var mesh = {
    vbo: null,
    tbo: null,
};
var shader = {
    standar: {
        program: null,
        attr: {},
        uniform: {}
    },
    gol: {
        program: null,
        attr: {},
        uniform: {}
    },
    point: {
        program: null,
        attr: {},
        uniform: {}
    },
    noise: {
        program: null,
        attr: {},
        uniform: {}
    },
    editor: {
        program: null,
        attr: {},
        uniform: {}
    }
};
var points = {
    vbo: null
};
var editor = {
    scale: 21,
    last_state: "pause",
    state: "pause",
    mouse: {x: 0, y: 0, z: 0, w: 0},
    offset: {x: 0, y: 0},
    grid_size: {x: 512, y: 512},
    add_points: [],
    drag: false,
};

function main() {
    webgl_init("webgl-canvas");
    get_grid_size();
    mesh_init();
    framebuffer_init();
    shader_init();
    event_init();
    resize_canvas();
    
    editor.offset = {x: webg_canvas.width / 2, y: webg_canvas.height / 2};
    
    prerender();
    loop();
};

function loop() {
    resize_canvas();
    update();
    render();
    requestAnimationFrame(loop);
}

function update() {
    if (editor.drag) {
        editor.offset.x += editor.mouse.z;
        editor.offset.y -= editor.mouse.w;
        
        editor.mouse.z = 0;
        editor.mouse.w = 0;
    }
}

function render() {
    // Buffer transference
    {
        gl.viewport(0, 0, editor.grid_size.x, editor.grid_size.y);
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo1);
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture2);
        draw_rect(shader.standar);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Process Game of Life
    {
        gl.viewport(0, 0, editor.grid_size.x, editor.grid_size.y);
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo2);
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture1);
        
        if (editor.state != "pause") {
            draw_rect(shader.gol);
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        if (editor.state == "step_forward") {
            editor.state = editor.last_state;
        }
    }
    
    // Render editor view
    {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.105, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture2);
        
        draw_rect(shader.editor, () => {
            gl.uniform2f(shader.editor.uniform.resolution, webg_canvas.width, webg_canvas.height);
            gl.uniform2f(shader.editor.uniform.offset, editor.offset.x, editor.offset.y);
            gl.uniform1f(shader.editor.uniform.scale, editor.scale);
        });
    }
}

function prerender() {
    gl.viewport(0, 0, editor.grid_size.x, editor.grid_size.y);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo2);
    
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function add_point() {
    const point = [
        Math.round(
            editor.grid_size.x / 2.0 +
            (editor.mouse.x - editor.offset.x) / editor.scale +
            0.5
        ),
        Math.round(
            editor.grid_size.y / 2.0 +
            (editor.mouse.y - webg_canvas.height + editor.offset.y) / editor.scale -
            0.5
        )
    ];
    
    {
        gl.viewport(0, 0, editor.grid_size.x, editor.grid_size.y);
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo2);
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture1);
        
        draw_rect(shader.point, () => {
            gl.uniform2f(shader.point.uniform.point, point[0], point[1]);
        });
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

function noise() {
    {
        gl.viewport(0, 0, editor.grid_size.x, editor.grid_size.y);
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo2);
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture1);
        
        draw_rect(shader.noise, () => {
            gl.uniform1f(shader.noise.uniform.seed, Math.random() * 5000);
        });
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

function event_init() {
    window.addEventListener("wheel", e => {
        const delta = Math.sign(e.deltaY) * 2;
        editor.scale = editor.scale / (1 + delta / 100);
    });
    
    window.addEventListener("mousemove", (e) => {
        editor.mouse = {
            x: e.clientX,
            y: e.clientY,
            z: e.movementX,
            w: e.movementY
        }
    });
    
    window.addEventListener("click", (e) => {
        add_point(e);
    });
    
    window.addEventListener("mousedown", (e) => {
        if (e.which == 2) {
            editor.drag = true;
        }
    });
    
    window.addEventListener("mouseup", (e) => {
        editor.drag = false;
    });
    
    window.addEventListener("keydown", (e) => {
        switch (e.code) {
            case "KeyD":
                editor.last_state = editor.state;
                editor.state = "step_forward";
                break;
            
            case "KeyR":
                prerender();
                break;

            case "KeyN":
                noise();
                break;
            
            case "Space":
                editor.last_state = editor.state;
                editor.state = editor.state == "pause" ? "" : "pause";
                break;
        }
    });
}

function framebuffer_init() {
    const width = editor.grid_size.x;
    const height = editor.grid_size.y;
    framebuffer.texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    framebuffer.fbo1 = gl.createFramebuffer();
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo1);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framebuffer.texture1, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    
    framebuffer.texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    framebuffer.fbo2 = gl.createFramebuffer();
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fbo2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framebuffer.texture2, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function resize_canvas() {
    webg_canvas.width = window.innerWidth;
    webg_canvas.height = window.innerHeight;
}

function draw_rect(shader, custom_uniforms=null) {
    gl.useProgram(shader.program);

    gl.enableVertexAttribArray(shader.attr.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(shader.attr.position, size, type, normalize, stride, offset);

    gl.enableVertexAttribArray(shader.attr.texcoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.tbo);

    // Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(shader.attr.texcoord, size, type, normalize, stride, offset);

    gl.uniform1i(shader.uniform.texcoord, 0);
    gl.uniform2f(shader.uniform.buffer_scale, editor.grid_size.x, editor.grid_size.y);
    
    if (custom_uniforms) {
        custom_uniforms();
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.useProgram(null);
}

function shader_init() {
    shader.standar.program = shader_create_program("vertex-shader", "shader-standar-frag");
    shader.standar.attr.position = gl.getAttribLocation(shader.standar.program, 'position');
    shader.standar.attr.texcoord = gl.getAttribLocation(shader.standar.program, 'texcoord');
    shader.standar.uniform.texture = gl.getUniformLocation(shader.standar.program, 'texture');
    shader.standar.uniform.buffer_scale = gl.getUniformLocation(shader.standar.program, 'buffer_scale');
    
    shader.gol.program = shader_create_program("vertex-shader", "shader-gol-frag");
    shader.gol.attr.position = gl.getAttribLocation(shader.gol.program, 'position');
    shader.gol.attr.texcoord = gl.getAttribLocation(shader.gol.program, 'texcoord');
    shader.gol.uniform.texture = gl.getUniformLocation(shader.gol.program, 'texture');
    shader.gol.uniform.buffer_scale = gl.getUniformLocation(shader.gol.program, 'buffer_scale');
    
    shader.point.program = shader_create_program("vertex-shader", "shader-point-frag");
    shader.point.attr.position = gl.getAttribLocation(shader.point.program, 'position');
    shader.point.attr.texcoord = gl.getAttribLocation(shader.point.program, 'texcoord');
    shader.point.uniform.texture = gl.getUniformLocation(shader.point.program, 'texture');
    shader.point.uniform.point = gl.getUniformLocation(shader.point.program, 'point');
    shader.point.uniform.buffer_scale = gl.getUniformLocation(shader.point.program, 'buffer_scale');
    
    shader.editor.program = shader_create_program("vertex-shader", "shader-editor-frag");
    shader.editor.attr.position = gl.getAttribLocation(shader.editor.program, 'position');
    shader.editor.attr.texcoord = gl.getAttribLocation(shader.editor.program, 'texcoord');
    shader.editor.uniform.texture = gl.getUniformLocation(shader.editor.program, 'texture');
    shader.editor.uniform.resolution = gl.getUniformLocation(shader.editor.program, 'resolution');
    shader.editor.uniform.offset = gl.getUniformLocation(shader.editor.program, 'offset');
    shader.editor.uniform.scale = gl.getUniformLocation(shader.editor.program, 'scale');
    shader.editor.uniform.buffer_scale = gl.getUniformLocation(shader.editor.program, 'buffer_scale');

    shader.noise.program = shader_create_program("vertex-shader", "shader-noise-frag");
    shader.noise.attr.position = gl.getAttribLocation(shader.noise.program, 'position');
    shader.noise.attr.texcoord = gl.getAttribLocation(shader.noise.program, 'texcoord');
    shader.noise.uniform.buffer_scale = gl.getUniformLocation(shader.noise.program, 'buffer_scale');
    shader.noise.uniform.seed = gl.getUniformLocation(shader.noise.program, 'seed');
}

function shader_create_program(vert, frag) {
    const vertex_shader =  gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex_shader, document.getElementById(vert).innerText);
    gl.compileShader(vertex_shader);
    
    if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the vertex shaders: ' + gl.getShaderInfoLog(vertex_shader));
        gl.deleteShader(vertex_shader);
        return;
    }
    
    const fragment_shader =  gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment_shader, document.getElementById(frag).innerText);
    gl.compileShader(fragment_shader);
    
    if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the fragment shaders: ' + gl.getShaderInfoLog(fragment_shader));
        gl.deleteShader(fragment_shader);
        return;
    }
    
    prog = gl.createProgram();
    gl.attachShader(prog, vertex_shader);
    gl.attachShader(prog, fragment_shader);
    gl.linkProgram(prog);
    
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(prog));
    }
    
    return prog;
}

function mesh_init() {
    mesh.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  0,
        -1,  1,  0,
         1, -1,  0,
        -1,  1,  0,
         1,  1,  0,
         1, -1,  0,
    ]), gl.STATIC_DRAW);
    
    mesh.tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.tbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1,
        1, 0,
    ]), gl.STATIC_DRAW);
    
    points.vbo = gl.createBuffer();
}

function webgl_init(canvas_id) {
    webg_canvas = document.getElementById(canvas_id);
    
    try {
        gl = webg_canvas.getContext("webgl");
    }
    catch(e) {}

    if (!gl) {
        console.log("WebGL is not supported.");
        gl = null;
    }

    return gl;
}

function get_grid_size() {
    const params = new URLSearchParams(window.location.search)
    const width = params.get("w");
    const height = params.get("h");
    
    if (width) {
        editor.grid_size.x = params.get("w");
    }
    
    if (height) {
        editor.grid_size.y = params.get("h");
    }
}

window.addEventListener("load", () => main());