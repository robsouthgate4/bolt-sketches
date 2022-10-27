

import Base from "@webgl/Base";
import Bolt, { Program, Transform, Mesh, Texture2D, CameraPersp, CLAMP_TO_EDGE, LINEAR, SRC_ALPHA, ONE_MINUS_SRC_ALPHA, FRONT, BACK, DrawSet, VBO, DYNAMIC_DRAW, STATIC_DRAW, POINTS, FLOAT, RGBA32f, NEAREST, RGBA16F, RGBA } from "@/webgl/libs/bolt";

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
import parseHdr from "@/webgl/modules/hdr-parse";
import PLYParser from "@/webgl/modules/ply-parse";
export default class extends Base {

	canvas: HTMLCanvasElement;
	visualiseProgram: Program;
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
	simulationProgramLocations: {
		oldPosition: number;
		oldVelocity: number;
		oldLifeTime: number;
		initPosition: number;
		initLifeTime: number;
		random: number;
		groupID: number;
		particleID: number; };
	pointCount = 256 * 256;
	transformFeedback: TransformFeedback;
	particleDrawState: DrawState;
	colorEase = new EaseNumber( config.colorMode === "light" ? 0 : 1, 0.02 );
	eventListeners = EventListeners.getInstance();
	volumeNormalTexture: Texture2D;
	volumeDistanceTexture: Texture2D;
	pointCloudTexture: Texture2D;
	pointCloud: Float32Array;

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById( "experience" );
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.bolt = Bolt.getInstance();
		this.bolt.init( this.canvas, { antialias: true, dpi: Math.min( 2, window.devicePixelRatio ), powerPreference: "high-performance" } );

		this.visualiseProgram = new Program( raymarchVertexShader, raymarchFragmentShader );
		this.lightPosition = vec3.fromValues( 0, 10, 0 );

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues( 2, 0, 1 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this.orbit = new Orbit( this.camera, {
			zoomSpeed: 0.1,
		} );

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

		const pointsPLY = await fetch( "/static/models/ply/toy-no-col.ply" );
		const pointsPLYText = await pointsPLY.text();
		const parsedPLY = new PLYParser().parse( pointsPLYText );
		this.pointCloud = new Float32Array( parsedPLY.points );


		this.volumeNormalTexture = new Texture2D( {
			imagePath: "/static/textures/volumes/toy-normal.png",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
			minFilter: NEAREST,
			magFilter: NEAREST,
			generateMipmaps: false,
		} );

		await this.volumeNormalTexture.load();

		this.volumeDistanceTexture = new Texture2D( {
			imagePath: "/static/textures/volumes/toy-distance.png",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
			minFilter: NEAREST,
			magFilter: NEAREST,
			generateMipmaps: false,
		} );

		await this.volumeDistanceTexture.load();

		this.assetsLoaded = true;

		this.visualiseProgram.activate();
		this.visualiseProgram.setTexture( "mapNormalVolume", this.volumeNormalTexture );
		this.visualiseProgram.setTexture( "mapDistanceVolume", this.volumeDistanceTexture );
		this.visualiseProgram.transparent = true;
		this.visualiseProgram.blendFunction = { src: SRC_ALPHA, dst: ONE_MINUS_SRC_ALPHA };

		// setup nodes
		this.cubeDrawSet = new DrawSet(
			new Mesh( geometry ),
			this.visualiseProgram
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
		this.simulationProgram.setFloat( "time", 0 );
		this.simulationProgram.setTexture( "mapNormalVolume", this.volumeNormalTexture );
		this.simulationProgram.setTexture( "mapDistanceVolume", this.volumeDistanceTexture );

		this.simulationProgramLocations = {
			"oldPosition": 0,
			"oldVelocity": 1,
			"oldLifeTime": 2,
			"initPosition": 3,
			"initLifeTime": 4,
			"random": 5,
			"groupID": 6,
			"particleID": 7
		};

		this.transformFeedback = new TransformFeedback( { bolt: this.bolt, count: this.pointCount } );

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


		for ( let i = 0; i < this.pointCount; i ++ ) {

			indices.push( i );

			const groupID = Math.floor( Math.random() * 2 );
			groupIds.push( groupID );

			lifeTimes.push( ( Math.random() + 0.5 ) * 10 );

			randoms.push(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			);

			const range = 0.1;

			offsets.push( 0, 0, 0 );

			const normal = Math.random() * 2 - 1;
			const scale = ( Math.random() * 0.5 + 0.5 ) + 0.1;

			scales.push( scale );
			normals.push( normal, normal, normal );

			velocities.push( ( Math.random() * 2 - 1 ) * 0.1, ( Math.random() * 2 - 1 ) * 0.1, Math.random() * 0.01 );

		}

		// buffers
		const offset1VBO = new VBO( new Float32Array( offsets ), DYNAMIC_DRAW );
		const offset2VBO = new VBO( new Float32Array( offsets ), DYNAMIC_DRAW );

		const velocity1VBO = new VBO( new Float32Array( velocities ), DYNAMIC_DRAW );
		const velocity2VBO = new VBO( new Float32Array( velocities ), DYNAMIC_DRAW );

		const life1VBO = new VBO( new Float32Array( lifeTimes ), DYNAMIC_DRAW );
		const life2VBO = new VBO( new Float32Array( lifeTimes ), DYNAMIC_DRAW );

		const init1VBO = new VBO( this.pointCloud, STATIC_DRAW );
		const initLife1VBO = new VBO( new Float32Array( lifeTimes ), STATIC_DRAW );
		const randomsVBO = new VBO( new Float32Array( randoms ), STATIC_DRAW );
		const groupsVBO = new VBO( new Float32Array( groupIds ), STATIC_DRAW );
		const particleIDsVBO = new VBO( new Float32Array( indices ), STATIC_DRAW );


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
				},
				{
					vbo1: particleIDsVBO,
					vbo2: particleIDsVBO,
					attributeLocation: this.simulationProgramLocations.particleID,
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
		pointMesh.setAttribute( new Float32Array( indices ), 1, 10 );
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



		const bgLight = this.config.light.backgroundColor;
		const bgDark = this.config.dark.backgroundColor;


		this.particleDrawState
			.uniformTexture( "mapVolume", this.volumeNormalTexture )
			.uniformFloat( "colorMode", this.colorEase.value )
			.uniformFloat( "time", elapsed )
			.setViewport( 0, 0, this.canvas.width, this.canvas.height )
			.clear(
				bgLight[ 0 ] * ( 1 - this.colorEase.value ) + bgDark[ 0 ] * ( this.colorEase.value ),
				bgLight[ 1 ] * ( 1 - this.colorEase.value ) + bgDark[ 1 ] * ( this.colorEase.value ),
				bgLight[ 2 ] * ( 1 - this.colorEase.value ) + bgDark[ 2 ] * ( this.colorEase.value ),
				bgLight[ 3 ] * ( 1 - this.colorEase.value ) + bgDark[ 3 ] * ( this.colorEase.value ) )
			.draw();

		this.simulationProgram.activate();
		this.simulationProgram.setFloat( "time", elapsed );
		this.simulationProgram.setFloat( "delta", delta );

		this.transformFeedback.compute();


		// vec3.copy( this.repellorPositinPrevious, this.repellorPosition );


		//this.bolt.draw( this.cubeDrawSet );

		//this.post.end();

		this.visualiseProgram.activate();
		this.visualiseProgram.setVector3( "viewPosition", this.camera.position );
		this.visualiseProgram.setFloat( "time", elapsed );

		//this.post.end();

	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
