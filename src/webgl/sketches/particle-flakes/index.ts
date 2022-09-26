

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, CameraPersp, DrawSet, DYNAMIC_DRAW, FBO, FLOAT, FRONT, Mesh, Program, Texture2D, VBO } from "@bolt-webgl/core";

import particlesVertexInstanced from "./shaders/particles/particles.vert";
import particlesFragmentInstanced from "./shaders/particles/particles.frag";

import depthVertexInstanced from "./shaders/depth/depth.vert";
import depthFragmentInstanced from "./shaders/depth/depth.frag";

import simulationVertex from "./shaders/simulation/simulation.vert";
import simulationFragment from "./shaders/simulation/simulation.frag";

import { mat4, vec3 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import GLTFLoader from "@/webgl/modules/gltf-loader";
import { GUI } from "lil-gui"
import EaseNumber from "@/webgl/helpers/EaseNumber";

export default class extends Base {

	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	particleProgram!: Program;
	camera!: CameraPersp;
	assetsLoaded!: boolean;
	simulationProgram!: Program;
	simulationProgramLocations!: { oldPosition: number; oldVelocity: number; oldLifeTime: number; initLifeTime: number; initPosition: number; };
	instanceCount = config.particleCount;
	bolt: Bolt;
	orbit!: Orbit;
	mesh!: Mesh;
	drawSet!: DrawSet;
	transformFeedback!: TransformFeedback;
	particleDrawState!: DrawState;
	depthDrawState!: DrawState;
	depthFBO!: FBO;
	shadowLight!: CameraOrtho;
	lightSpaceMatrix = mat4.create();
	config: any;
	maptcapDark!: Texture2D;
	maptcapLight!: Texture2D;
	colorEase = new EaseNumber(config.colorMode === "light" ? 0 : 1, 0.02);

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById("experience");
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		// initialize bolt
		this.bolt = Bolt.getInstance();
		this.bolt.init(this.canvas, { antialias: true, dpi: Math.min(2, window.devicePixelRatio), powerPreference: "high-performance" });

		this.gl = this.bolt.getContext();

		this.initScene();
		this.initSketch();
		this.initGUI();


	}

	// construct the scene
	initScene() {

		this.camera = new CameraPersp({
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues(0, 30, 20),
			target: vec3.fromValues(0, 1, 0),
		});

		const frustumSize = 20;

		this.shadowLight = new CameraOrtho({
			left: - frustumSize,
			right: frustumSize,
			bottom: - frustumSize,
			top: frustumSize,
			near: 1,
			far: 100,
			position: vec3.fromValues(0, 15, 5),
			target: vec3.fromValues(0, 0, 0),
		});

		mat4.multiply(this.lightSpaceMatrix, this.shadowLight.projection, this.shadowLight.view);

		this.orbit = new Orbit(this.camera, {
			minElevation: -Infinity,
			maxElevation: Infinity,
			ease: 0.06,
		});

		this.bolt.setCamera(this.camera);
		this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
		this.bolt.enableDepth();

	}

	// construct the sketch
	async initSketch() {

		this.depthFBO = new FBO({ width: 2048, height: 2048, depth: true });

		this.particleProgram = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const transformFeedbackVaryings = [
			"newPosition",
			"newVelocity",
			"newLifeTime"
		];

		this.simulationProgram = new Program(
			simulationVertex,
			simulationFragment,
			{
				transformFeedbackVaryings
			});

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("lifeTime", 4);
		this.simulationProgram.setFloat("time", 0);

		this.simulationProgramLocations = {
			"oldPosition": 0,
			"oldVelocity": 1,
			"oldLifeTime": 2,
			"initPosition": 3,
			"initLifeTime": 4
		};

		this.transformFeedback = new TransformFeedback({ bolt: this.bolt, count: this.instanceCount });

		const gltfLoader = new GLTFLoader(this.bolt, true);
		await gltfLoader.load("/static/models/gltf/examples/disk-particle/scene.glb");
		const diskMesh = gltfLoader.drawSetsFlattened[0].mesh;

		this.maptcapDark = new Texture2D({
			imagePath: "/static/textures/matcap/matcap-black.jpeg",
			wrapS: this.gl.CLAMP_TO_EDGE,
			wrapT: this.gl.CLAMP_TO_EDGE,
		});

		this.maptcapLight = new Texture2D({
			imagePath: "/static/textures/matcap/matcap-reflective.jpeg",
			wrapS: this.gl.CLAMP_TO_EDGE,
			wrapT: this.gl.CLAMP_TO_EDGE,
		});

		await this.maptcapDark.load();
		await this.maptcapLight.load();

		this.assetsLoaded = true;

		const offsets: number[] = [];
		const velocities: number[] = [];
		const lifeTimes: number[] = [];

		for (let i = 0; i < this.instanceCount; i++) {

			lifeTimes.push((Math.random() + 0.5) * 20);

			offsets.push((Math.random() * 2 - 1) * 5);
			offsets.push((Math.random() * 2 - 1) * 5);
			offsets.push((Math.random() * 2 - 1) * 5);

			velocities.push(0);
			velocities.push(0);
			velocities.push(0);

		}

		// buffers
		const offset1VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);
		const offset2VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);

		const velocity1VBO = new VBO(new Float32Array(velocities), DYNAMIC_DRAW);
		const velocity2VBO = new VBO(new Float32Array(velocities), DYNAMIC_DRAW);

		const life1VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);
		const life2VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);

		const init1VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);
		const initLife1VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);

		this.transformFeedback.bindVAOS(
			[
				{
					vbo1: offset1VBO,
					vbo2: offset2VBO,
					attributeLocation: this.simulationProgramLocations.oldPosition,
					size: 3,
					requiresSwap: true
				},
				{
					vbo1: velocity1VBO,
					vbo2: velocity2VBO,
					attributeLocation: this.simulationProgramLocations.oldVelocity,
					size: 3,
					requiresSwap: true
				},
				{
					vbo1: life1VBO,
					vbo2: life2VBO,
					attributeLocation: this.simulationProgramLocations.oldLifeTime,
					size: 1,
					requiresSwap: true
				},
				{
					vbo1: init1VBO,
					vbo2: init1VBO,
					attributeLocation: this.simulationProgramLocations.initPosition,
					size: 3,
					requiresSwap: false
				},
				{
					vbo1: initLife1VBO,
					vbo2: initLife1VBO,
					attributeLocation: this.simulationProgramLocations.initLifeTime,
					size: 1,
					requiresSwap: false
				}
			]
		);


		this.resize();

		const pp = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const particleDrawSet = new DrawSet(new Mesh({
			...diskMesh.buffers
		}, {
			instanced: true,
			instanceCount: config.particleCount
		}), pp);

		const dp = new Program(depthVertexInstanced, depthFragmentInstanced);

		const depthDrawSet = new DrawSet(new Mesh({
			...diskMesh.buffers
		}, {
			instanced: true,
			instanceCount: config.particleCount
		}), dp);


		const bg = this.config[this.config.colorMode].backgroundColor;

		// prepare draw states

		this.depthDrawState = new DrawState(this.bolt)
			.setDrawSet(depthDrawSet)
			.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 1)
			.setVbo(life1VBO, 1, 4, FLOAT, 0, 1)
			.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 1)
			.setVbo(offset1VBO, 3, 2, FLOAT, 0, 1)
			.setFbo(this.depthFBO)
			.uniformFloat("particleScale", this.config.particleScale)
			.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
			.setViewport(0, 0, this.depthFBO.width, this.depthFBO.height)
			.clear(0, 0, 0, 1)

		this.particleDrawState = new DrawState(this.bolt)
			.setDrawSet(particleDrawSet)
			.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 1)
			.setVbo(life1VBO, 1, 4, FLOAT, 0, 1)
			.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 1)
			.setVbo(offset1VBO, 3, 2, FLOAT, 0, 1)
			.uniformTexture("mapDepth", this.depthFBO.depthTexture!)
			.uniformFloat("shadowStrength", this.config.shadowStrength)
			.uniformFloat("particleScale", this.config.particleScale)
			.uniformFloat("colorMode", this.config.colorMode === "light" ? 0 : 1)
			.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
			.uniformTexture("mapMatcapLight", this.maptcapLight)
			.uniformTexture("mapMatcapDark", this.maptcapDark)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.clear(bg[0], bg[1], bg[2], bg[3])


	}

	initGUI() {

		const gui = new GUI();

		const folder = gui;

		folder.add(this.config, "particleCount", [5000, 10000, 20000, 30000]).onChange((valu: number) => { });

		folder.add(this.config, "particleScale", 0.1, 1).step(0.01).onChange((value: number) => {
			this.particleDrawState.uniformFloat("particleScale", value);
		});

		folder.add(this.config, "particleSpeed", 0.1, 10).step(0.1);
		folder.add(this.config, "particleLifeTime", 0.1, 10).step(0.1);

		folder.add(this.config, "shadowStrength", 0.1, 1).step(0.1).onChange((value: number) => {
			this.particleDrawState.uniformFloat("shadowStrength", value);
		});

		folder.add(this.config, "colorMode", ["light", "dark"]).onChange((value: string) => {
			this.config.colorMode = value;
			this.colorEase.value = value === "light" ? 0 : 1;
		});

		folder.open();

	}

	resize() {

		this.bolt.resizeFullScreen();
		this.camera.updateProjection(this.gl.canvas.width / this.gl.canvas.height);

	}

	earlyUpdate(elapsed: number, delta: number) {

		return;

	}

	update(elapsed: number, delta: number) {

		if (!this.assetsLoaded) return;

		this.orbit.update();

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("time", elapsed);
		this.transformFeedback.compute();

		this.depthDrawState.draw()
		console.log(this.config)

		const bgLight = this.config.light.backgroundColor;
		const bgDark = this.config.dark.backgroundColor;

		this.particleDrawState
			.uniformFloat("colorMode", this.colorEase.value)
			.clear(
				bgLight[0] * (1 - this.colorEase.value) + bgDark[0] * (this.colorEase.value),
				bgLight[1] * (1 - this.colorEase.value) + bgDark[1] * (this.colorEase.value),
				bgLight[2] * (1 - this.colorEase.value) + bgDark[2] * (this.colorEase.value),
				bgLight[3] * (1 - this.colorEase.value) + bgDark[3] * (this.colorEase.value))
			.draw()


	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
