

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, CameraPersp, CLAMP_TO_EDGE, DrawSet, DYNAMIC_DRAW, FBO, FLOAT, LINE_STRIP, Mesh, POINTS, Program, STATIC_DRAW, Texture2D, VBO } from "@/webgl/libs/bolt";

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
import { GUI } from "lil-gui";
import EaseNumber from "@/webgl/helpers/EaseNumber";
import Raycast from "@/webgl/modules/raycast";
import EventListeners from "@/webgl/modules/event-listeners";
import Ray from "@/webgl/modules/raycast/Ray";
import { GL_RESIZE_TOPIC, GL_TOUCH_MOVE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import Sphere from "@/webgl/modules/primitives/Sphere";

import normalVertexShader from "./shaders/normal/normal.vert";
import normalFragmentShader from "./shaders/normal/normal.frag";

import splineVertexShader from "./shaders/spline/spline.vert";
import splineFragmentShader from "./shaders/spline/spline.frag";

import pointVertexShader from "./shaders/point/point.vert";
import pointFragmentShader from "./shaders/point/point.frag";

import EaseVec3 from "@/webgl/helpers/EaseVector3";
import { getDeviceType } from "@/utils";
import Post from "@/webgl/modules/post";
import { catmullRomInterpolation, CatmullRom } from "@/webgl/modules/splines";
import BokehPass from "@/webgl/modules/post/passes/BokehPass";

export default class extends Base {

	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	particleProgram!: Program;
	camera!: CameraPersp;
	assetsLoaded!: boolean;
	simulationProgram!: Program;
	simulationProgramLocations!: {
		oldPosition: number;
		oldVelocity: number;
		oldLifeTime: number;
		initLifeTime: number;
		initPosition: number;
		random: number;
		groupID: number;
	};
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
	colorEase = new EaseNumber( config.colorMode === "light" ? 0 : 1, 0.02 );
	raycaster = new Raycast();
	eventListeners = EventListeners.getInstance();
	ray: Ray;
	repellorDebug: DrawSet;
	repellorTarget = new EaseVec3( 0, 0, 0, 0.3 );
	repellorPosition = vec3.create();
	repellorPositinPrevious = vec3.create();
	pointCount = 20;
	lineCount = 24;
	lineDrawState: FBO;
	lineDrawSet: DrawSet;
	pointDrawSet: DrawSet;
	catmullRom: CatmullRom;
	points: any[];
	post: Post;

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById( "experience" );
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		// initialize bolt
		this.bolt = Bolt.getInstance();
		this.bolt.init( this.canvas, { antialias: true, dpi: Math.min( 2, window.devicePixelRatio ), powerPreference: "high-performance" } );

		this.gl = this.bolt.getContext();

		this.depthFBO = new FBO( { width: this.width, height: this.height, depth: true } );


		this.repellorDebug = new DrawSet(
			new Mesh( new Sphere() ), new Program( normalVertexShader, normalFragmentShader )
		);

		this.repellorDebug.transform.scale = vec3.fromValues( 1, 1, 1 );

		this.repellorDebug.transform.position = vec3.fromValues( 1, 0, - 8 );

		this.initScene();
		this.initSketch();
		//this.initGUI();
		this.initListeners();

	}

	private initListeners() {

		this.eventListeners.listen( GL_TOUCH_MOVE_TOPIC, ( e: any ) => {

			const { normalized } = e.detail;

			const scale = vec3.distance( this.camera.position, this.camera.target );

			this.ray = this.raycaster.generateRayFromCamera( normalized.x, normalized.y, this.camera );

			const rayEnd = vec3.clone( this.ray.origin );
			const rayScaled = vec3.create();

			vec3.multiply( rayScaled, this.ray.direction, vec3.fromValues( scale, scale, scale ) );
			vec3.add( rayEnd, rayEnd, rayScaled );

			this.repellorTarget.x = rayEnd[ 0 ];
			this.repellorTarget.y = rayEnd[ 1 ];
			this.repellorTarget.z = rayEnd[ 2 ];

		} );

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.camera.updateProjection( this.width / this.height );

		} );

	}

	// construct the scene
	private initScene() {

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.01,
			far: 10,
			position: vec3.fromValues( 0, 0, 2 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this.orbit = new Orbit( this.camera, {
			minRadius: 0.3,
			maxRadius: 50,
			minElevation: - Math.PI * 0.5,
			maxElevation: Math.PI * 0.5,
			ease: 0.1,
			zoomSpeed: 0.1,
		} );

		this.bolt.setCamera( this.camera );
		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.enableDepth();

		this.post = new Post( this.bolt, { outputDepth: true } );

		const bokehPass = new BokehPass( this.bolt, { width: this.width, height: this.height } );

		this.post.add( bokehPass, true );

		this.resize();


	}

	private getPointPositions( count: number ) {

		const p = [];

		for ( let i = 0; i < count; i ++ ) {

			const x = Math.cos( i * 0.7 ) * 0.1;
			const y = - ( i - count / 2 ) * 0.12;
			const z = - Math.sin( i * 0.7 ) * 0.05;

			p[ i ] = vec3.fromValues( x, y, z );

		}

		return p;

	}

	private createSpline( p0: vec3, p1: vec3, p2: vec3, p3: vec3 ) {

		const curve: vec3[] = [];

		for ( let i = 0; i < this.lineCount; i ++ ) {

			const b = catmullRomInterpolation( p0, p1, p2, p3, i / this.lineCount );
			curve[ i ] = b;

		}

		return curve;

	}

	private constructDebugSpline() {

		const spline = [];
		this.points = this.getPointPositions( this.pointCount );

		this.catmullRom = new CatmullRom( this.points );

		const pointAtTime = this.catmullRom.getPoint( 1 );

		for ( let i = 0; i < this.pointCount - 3; i ++ ) {

			const p = this.points;
			spline[ i ] = this.createSpline( p[ i ], p[ i + 1 ], p[ i + 2 ], p[ i + 3 ] );

		}

		// create line segments for curve drawing
		const flattenedPoints = [];

		for ( let i = 0; i < spline.length; i ++ ) {

			const segment = spline[ i ];

			for ( let j = 0; j < segment.length; j ++ ) {

				const p = segment[ j ];
				flattenedPoints.push( p[ 0 ], p[ 1 ], p[ 2 ] );

			}

		}

		const pointSplineMesh = new Mesh( {
			positions: pointAtTime,
		} ).setDrawType( POINTS );

		const lineMesh = new Mesh( {
			positions: new Float32Array( flattenedPoints )
		} ).setDrawType( LINE_STRIP );

		this.pointDrawSet = new DrawSet( pointSplineMesh, new Program( pointVertexShader, pointFragmentShader ) );
		this.lineDrawSet = new DrawSet( lineMesh, new Program( splineVertexShader, splineFragmentShader ) );


	}

	// construct the sketch
	async initSketch() {


		this.constructDebugSpline();

		this.particleProgram = new Program( particlesVertexInstanced, particlesFragmentInstanced );

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
			} );

		this.simulationProgram.activate();
		this.simulationProgram.setFloat( "lifeTime", 4 );
		this.simulationProgram.setFloat( "particleLifeRate", this.config.particleLifeRate );
		this.simulationProgram.setFloat( "particleLifeTime", this.config.particleLifeTime );
		this.simulationProgram.setFloat( "particleSpeed", this.config.particleSpeed );
		this.simulationProgram.setFloat( "repellorStrength", this.config.repellorStrength );
		this.simulationProgram.setFloat( "curlStrength", this.config.curlStrength );

		this.points.forEach( ( p, i ) => {

			this.simulationProgram.setVector3( `splinePoints[${ i }]`, p );

		} );


		this.simulationProgram.setFloat( "time", 0 );

		this.simulationProgramLocations = {
			"oldPosition": 0,
			"oldVelocity": 1,
			"oldLifeTime": 2,
			"initPosition": 3,
			"initLifeTime": 4,
			"random": 5,
			"groupID": 6,
		};

		this.transformFeedback = new TransformFeedback( { bolt: this.bolt, count: this.instanceCount } );

		this.maptcapDark = new Texture2D( {
			imagePath: "/static/textures/matcap/blue-matcap.jpg",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
		} );

		this.maptcapLight = new Texture2D( {
			imagePath: "/static/textures/matcap/gold-matcap.jpeg",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
		} );

		await this.maptcapDark.load();
		await this.maptcapLight.load();

		this.assetsLoaded = true;

		this._initMesh();

	}

	private _initMesh() {


		const positions: number[] = [];
		const offsets: number[] = [];
		const velocities: number[] = [];
		const lifeTimes: number[] = [];
		const normals: number[] = [];
		const scales: number[] = [];
		const randoms: number[] = [];
		const groupIds: number[] = [];


		for ( let i = 0; i < this.instanceCount; i ++ ) {

			const groupID = Math.floor( Math.random() * 2 );
			groupIds.push( groupID );

			lifeTimes.push( ( Math.random() + 0.5 ) * 10 );

			randoms.push(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			);

			const positionX = this.points[ 0 ][ 0 ] + ( Math.random() * 2 - 1 ) * 0.2;
			const positionY = this.points[ 0 ][ 1 ] + Math.random() * 2.0;
			const positionZ = this.points[ 0 ][ 2 ] + ( Math.random() * 2 - 1 ) * 0.2;

			offsets.push( positionX, positionY, positionZ );

			const normal = Math.random() * 2 - 1;
			const scale = ( Math.random() * 0.5 + 0.5 ) + 0.1;

			positions.push( positionX, positionY, positionZ );

			scales.push( scale );
			normals.push( normal, normal, normal );

			velocities.push( 0, 0, 0 );

		}


		// buffers
		const offset1VBO = new VBO( new Float32Array( offsets ), DYNAMIC_DRAW );
		const offset2VBO = new VBO( new Float32Array( offsets ), DYNAMIC_DRAW );

		const velocity1VBO = new VBO( new Float32Array( velocities ), DYNAMIC_DRAW );
		const velocity2VBO = new VBO( new Float32Array( velocities ), DYNAMIC_DRAW );

		const life1VBO = new VBO( new Float32Array( lifeTimes ), DYNAMIC_DRAW );
		const life2VBO = new VBO( new Float32Array( lifeTimes ), DYNAMIC_DRAW );

		const init1VBO = new VBO( new Float32Array( offsets ), STATIC_DRAW );
		const initLife1VBO = new VBO( new Float32Array( lifeTimes ), STATIC_DRAW );
		const randomsVBO = new VBO( new Float32Array( randoms ), STATIC_DRAW );
		const groupsVBO = new VBO( new Float32Array( groupIds ), STATIC_DRAW );


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
				},
				{
					vbo1: randomsVBO,
					vbo2: randomsVBO,
					attributeLocation: this.simulationProgramLocations.random,
					size: 3,
					requiresSwap: false
				},
				{
					vbo1: groupsVBO,
					vbo2: groupsVBO,
					attributeLocation: this.simulationProgramLocations.groupID,
					size: 1,
					requiresSwap: false
				}
			]
		);

		const pp = new Program( particlesVertexInstanced, particlesFragmentInstanced );

		const pointMesh = new Mesh( {
			positions,
			normals
		} ).setDrawType( POINTS );

		pointMesh.setAttribute( new Float32Array( scales ), 1, 7 );
		pointMesh.setVBO( offset1VBO, 3, 2 );

		const particleDrawSet = new DrawSet( pointMesh, pp );

		const bg = this.config[ this.config.colorMode ].backgroundColor;

		// prepare draw states

		this.particleDrawState = new DrawState( this.bolt )
			.setDrawSet( particleDrawSet )
			.setVbo( velocity1VBO, 3, 6, FLOAT, 0, 0 )
			.setVbo( life1VBO, 1, 4, FLOAT, 0, 0 )
			.setVbo( initLife1VBO, 1, 5, FLOAT, 0, 0 )
			.setVbo( offset1VBO, 3, 2, FLOAT, 0, 0 )
			.setVbo( randomsVBO, 3, 8, FLOAT, 0, 0 )
			.setVbo( groupsVBO, 1, 9, FLOAT, 0, 0 )
			.uniformTexture( "mapDepth", this.depthFBO.depthTexture! )
			.uniformFloat( "shadowStrength", this.config.shadowStrength )
			.uniformFloat( "particleScale", this.config.particleScale )
			.uniformFloat( "colorMode", this.config.colorMode === "light" ? 0 : 1 )
			.uniformTexture( "mapMatcapLight", this.maptcapLight )
			.uniformTexture( "mapMatcapDark", this.maptcapDark )
			.setViewport( 0, 0, this.canvas.width, this.canvas.height )
			.clear( bg[ 0 ], bg[ 1 ], bg[ 2 ], bg[ 3 ] );

	}

	private initGUI() {

		const gui = new GUI();

		const folder = gui;

		// folder.add(this.config, "particleCount", [5000, 10000, 20000, 30000]).onChange((value: number) => {

		// 	localStorage.setItem("particleCount", value.toString());
		// 	window.location.reload();

		// });

		// folder.add(this.config, "particleScale", 0.1, 1).step(0.01).onChange((value: number) => {
		// 	this.particleDrawState.uniformFloat("particleScale", value);
		// });

		// folder.add(this.config, "particleSpeed", 0.1, 2).step(0.1).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("particleSpeed", value);
		// });

		// folder.add(this.config, "particleLifeRate", 0.01, 0.08).step(0.01).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("particleLifeRate", value);
		// });

		// folder.add(this.config, "curlStrength", 1, 5).step(0.1).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("curlStrength", value);
		// });

		// folder.add(this.config, "shadowStrength", 0.1, 1).step(0.1).onChange((value: number) => {
		// 	this.particleDrawState.uniformFloat("shadowStrength", value);
		// });

		// folder.add(this.config, "colorMode", ["light", "dark"]).onChange((value: string) => {
		// 	this.config.colorMode = value;
		// 	this.colorEase.value = value === "light" ? 0 : 1;
		// });

		folder.open();

	}

	private resize() {


		this.bolt.resizeCanvasToDisplay();
		this.post.resize( this.canvas.width, this.canvas.height );
		this.camera.updateProjection( this.canvas.width / this.canvas.height );

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {


		if ( ! this.assetsLoaded ) return;

		this.orbit.update();

		vec3.set( this.repellorPosition, this.repellorTarget.x, this.repellorTarget.y, this.repellorTarget.z );

		let d = vec3.distance( this.repellorPosition, this.repellorPositinPrevious );
		d = Math.min( d, 1 ) * 10;

		this.simulationProgram.activate();
		this.simulationProgram.setFloat( "time", elapsed );
		this.simulationProgram.setVector3( "repellorPosition", this.repellorPosition );
		this.simulationProgram.setFloat( "repellorScale", d );
		this.simulationProgram.setFloat( "delta", delta );
		this.transformFeedback.compute();

		//this.depthDrawState.draw()

		const bgLight = this.config.light.backgroundColor;
		const bgDark = this.config.dark.backgroundColor;

		this.post.begin();

		this.particleDrawState
			.uniformFloat( "colorMode", this.colorEase.value )
			.uniformFloat( "time", elapsed )
			.clear(
				bgLight[ 0 ] * ( 1 - this.colorEase.value ) + bgDark[ 0 ] * ( this.colorEase.value ),
				bgLight[ 1 ] * ( 1 - this.colorEase.value ) + bgDark[ 1 ] * ( this.colorEase.value ),
				bgLight[ 2 ] * ( 1 - this.colorEase.value ) + bgDark[ 2 ] * ( this.colorEase.value ),
				bgLight[ 3 ] * ( 1 - this.colorEase.value ) + bgDark[ 3 ] * ( this.colorEase.value ) )
			.draw();


		// vec3.copy( this.repellorPositinPrevious, this.repellorPosition );

		//this.bolt.draw( this.lineDrawSet );

		this.post.end();

	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
