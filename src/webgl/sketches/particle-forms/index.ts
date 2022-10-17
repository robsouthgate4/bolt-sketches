

import Base from "@webgl/Base";
import Bolt, { Program, Transform, Mesh, Texture2D, CameraPersp, CLAMP_TO_EDGE, LINEAR, SRC_ALPHA, ONE_MINUS_SRC_ALPHA, FRONT, BACK, DrawSet, VBO, DYNAMIC_DRAW, STATIC_DRAW, POINTS, FLOAT } from "@/webgl/libs/bolt";

import raymarchVertexShader from "./shaders/raymarch/raymarch.vert";
import raymarchFragmentShader from "./shaders/raymarch/raymarch.frag";

import simulationVertexShader from "./shaders/simulation/simulation.vert";
import simulationFragmentShader from "./shaders/simulation/simulation.frag";

import particlesVertexShader from "./shaders/particles/particles.vert";
import particlesFragmentShader from "./shaders/particles/particles.frag";

import { vec3, } from "gl-matrix";
import Orbit from "@/webgl/modules/orbit";
import Cube from "@/webgl/modules/primitives/Cube";
import Post from "@/webgl/modules/post";
import FXAAPass from "@/webgl/modules/post/passes/FXAAPass";
import config from "./config";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import DrawState from "@/webgl/modules/draw-state";

import EaseNumber from "@/webgl/helpers/EaseNumber";
import { GL_RESIZE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import EventListeners from "@/webgl/modules/event-listeners";

export default class extends Base {

	canvas: HTMLCanvasElement;
	program: Program;
	lightPosition: vec3;
	camera: CameraPersp;
	assetsLoaded!: boolean;
	torusTransform!: Transform;
	cubeDrawSet!: DrawSet;
	bolt: Bolt;
	post: Post;
	orbit: Orbit;
	particleProgram: Program;
	simulationProgram: Program;
	config: any;
	simulationProgramLocations: { oldPosition: number; oldVelocity: number; oldLifeTime: number; initPosition: number; initLifeTime: number; random: number; groupID: number; };
	instanceCount = 50000;
	transformFeedback: TransformFeedback;
	particleDrawState: DrawState;
	colorEase = new EaseNumber( config.colorMode === "light" ? 0 : 1, 0.02 );
	eventListeners = EventListeners.getInstance();

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById( "experience" );
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.bolt = Bolt.getInstance();
		this.bolt.init( this.canvas, { antialias: true, powerPreference: "high-performance" } );

		this.program = new Program( raymarchVertexShader, raymarchFragmentShader );
		this.lightPosition = vec3.fromValues( 0, 10, 0 );

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues( 2, 0, 4 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this.orbit = new Orbit( this.camera );

		this.post = new Post( this.bolt );

		this.post.add( new FXAAPass( this.bolt, {
			width: this.width,
			height: this.height,
		} ), true );

		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.setCamera( this.camera );
		this.bolt.enableDepth();

		this.initSketch();
		this.resize();


	}
	// construct the sketch
	async initSketch() {

		const geometry = new Cube( { widthSegments: 1, heightSegments: 1, depthSegments: 1 } );

		const volumeTexture = new Texture2D( {
			imagePath: "/static/textures/volumes/volume-rubber.png",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
			minFilter: LINEAR,
			magFilter: LINEAR,
			generateMipmaps: false,
		} );

		await volumeTexture.load();


		this.assetsLoaded = true;

		this.program.activate();
		this.program.setTexture( "mapVolume", volumeTexture );
		this.program.transparent = true;
		this.program.blendFunction = { src: SRC_ALPHA, dst: ONE_MINUS_SRC_ALPHA };

		// setup nodes
		this.cubeDrawSet = new DrawSet(
			new Mesh( geometry ),
			this.program
		);

		this.particleProgram = new Program( particlesVertexShader, particlesFragmentShader );

		const transformFeedbackVaryings = [
			"newPosition",
			"newVelocity",
			"newLifeTime"
		];

		this.simulationProgram = new Program(
			simulationVertexShader,
			simulationFragmentShader,
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
		this.simulationProgram.setTexture( "mapVolume", volumeTexture );


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

		this.assetsLoaded = true;

		this.initMesh();

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;

			this.bolt.resizeCanvasToDisplay( this.canvas );
			this.camera.updateProjection( this.width / this.height );

		} );

	}

	private initMesh() {


		const positions: number[] = [];
		const offsets: number[] = [];
		const velocities: number[] = [];
		const lifeTimes: number[] = [];
		const normals: number[] = [];
		const scales: number[] = [];
		const randoms: number[] = [];
		const groupIds: number[] = [];
		const indices: number[] = [];


		for ( let i = 0; i < this.instanceCount; i ++ ) {

			indices.push( i );

			const groupID = Math.floor( Math.random() * 2 );
			groupIds.push( groupID );

			lifeTimes.push( ( Math.random() + 0.5 ) * 10 );

			randoms.push(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			);

			const range = 0.01;

			const positionX = ( Math.random() * 2 - 1 ) * range;
			const positionY = ( Math.random() * 2 - 1 ) * range;
			const positionZ = ( Math.random() * 2 - 1 ) * range;

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

		const pp = new Program( particlesVertexShader, particlesFragmentShader );

		const pointMesh = new Mesh( {
			positions,
			normals,
			indices,
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
			.uniformFloat( "shadowStrength", this.config.shadowStrength )
			.uniformFloat( "particleScale", this.config.particleScale )
			.uniformFloat( "colorMode", this.config.colorMode === "light" ? 0 : 1 )
			.setViewport( 0, 0, this.canvas.width, this.canvas.height )
			.clear( bg[ 0 ], bg[ 1 ], bg[ 2 ], bg[ 3 ] );

	}

	resize() {

		this.bolt.resizeCanvasToDisplay();
		this.camera.updateProjection( this.canvas.width / this.canvas.height );
		this.post.resize( this.canvas.width, this.canvas.height );

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {

		if ( ! this.assetsLoaded ) return;

		this.orbit.update();

		this.simulationProgram.activate();
		this.simulationProgram.setFloat( "time", elapsed );
		this.simulationProgram.setFloat( "delta", delta );

		this.transformFeedback.compute();

		const bgLight = this.config.light.backgroundColor;
		const bgDark = this.config.dark.backgroundColor;


		this.particleDrawState
			.uniformFloat( "colorMode", this.colorEase.value )
			.uniformFloat( "time", elapsed )
			.setViewport( 0, 0, this.canvas.width, this.canvas.height )
			.clear(
				bgLight[ 0 ] * ( 1 - this.colorEase.value ) + bgDark[ 0 ] * ( this.colorEase.value ),
				bgLight[ 1 ] * ( 1 - this.colorEase.value ) + bgDark[ 1 ] * ( this.colorEase.value ),
				bgLight[ 2 ] * ( 1 - this.colorEase.value ) + bgDark[ 2 ] * ( this.colorEase.value ),
				bgLight[ 3 ] * ( 1 - this.colorEase.value ) + bgDark[ 3 ] * ( this.colorEase.value ) )
			.draw();


		// vec3.copy( this.repellorPositinPrevious, this.repellorPosition );

		this.bolt.draw( this.cubeDrawSet );

		//this.post.end();

		this.program.activate();
		this.program.setVector3( "viewPosition", this.camera.position );
		this.program.setFloat( "time", elapsed );

		//this.post.end();

	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
