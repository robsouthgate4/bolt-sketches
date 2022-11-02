

import Base from "@webgl/Base";
import Bolt, { Program, Transform, Mesh, Texture2D, CameraPersp, DrawSet, FLOAT, RGBA16F, RGBA, TextureCube, LINEAR, FBO } from "@/webgl/libs/bolt";

import raymarchVertexShader from "./shaders/raymarch/raymarch.vert";
import raymarchFragmentShader from "./shaders/raymarch/raymarch.frag";



import { vec2, vec3, vec4, } from "gl-matrix";
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

import pako from "pako";
import Snow from "./components/snow";
import GLTFLoader from "@/webgl/modules/gltf-loader";
import Globe from "./components/globe";
import parseHdr from "@/webgl/modules/hdr-parse";
import { bellCurve } from "@/utils";
import Monster from "./components/monster";
import Plane from "@/webgl/modules/primitives/Plane";
import { getImageLightness } from "./utils";
import Background from "./components/background";
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
	colorEase = new EaseNumber( config.colorMode === "light" ? 1 : 0, 0.02 );
	eventListeners = EventListeners.getInstance();
	volumeNormalTexture: Texture2D;
	volumeDistanceTexture: Texture2D;
	pointCloudTexture: Texture2D;
	pointCloud: Float32Array;
	snow: Snow;
	gtlfLoader: GLTFLoader;
	sphereGLB: DrawSet;
	globe: Globe;
	monster: Monster;
	sceneFBO: FBO;
	background: Background;

	constructor() {

		super();


		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById( "experience" );
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.eventListeners.setBoundElement( this.canvas );

		this.bolt = Bolt.getInstance();
		this.bolt.init( this.canvas, { antialias: true, dpi: Math.min( 2, window.devicePixelRatio ), powerPreference: "high-performance" } );

		this.visualiseProgram = new Program( raymarchVertexShader, raymarchFragmentShader );
		this.lightPosition = vec3.fromValues( 0, 10, 0 );

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues( 0, 1, 5 ),
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

		this.sceneFBO = new FBO( { width: this.canvas.width, height: this.canvas.height, depth: true } );

		this.snow = new Snow();
		await this.snow.init();


		this.gtlfLoader = new GLTFLoader( this.bolt, true );
		await this.gtlfLoader.load( "/static/models/gltf/sphere.glb" );

		const hdrLoad = await fetch( "/static/textures/hdr/studio.hdr" );
		const hdriBuffer = await hdrLoad.arrayBuffer();
		const hdrParsed = parseHdr( hdriBuffer );

		const environmentHDRI = new Texture2D( {
			internalFormat: RGBA16F,
			format: RGBA,
			type: FLOAT,
			generateMipmaps: false } );

		environmentHDRI.setFromData( hdrParsed.data, hdrParsed.shape[ 0 ], hdrParsed.shape[ 1 ] );

		const environmentTexture = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/trees.png" } );
		await environmentTexture.load();
		this.background = new Background( { map: environmentTexture } );


		this.sphereGLB = this.gtlfLoader.drawSetsFlattened[ 0 ];
		this.globe = new Globe( { mesh: this.sphereGLB.mesh, mapEnv: environmentHDRI } );

		const monsterColor = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/monster-color.png" } );
		await monsterColor.load();

		const monsterDepth = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/monster-depth.png" } );
		await monsterDepth.load();

		getImageLightness( "/static/textures/sketches/snow-globe/monster2-depth.png", ( pixels: vec4[], brightness: number[], min: number, max: number ) => {

			console.log( max );

		} );

		this.monster = new Monster( { map: monsterColor, mapDepth: monsterDepth } );

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;

			this.resize();

		} );

		this.assetsLoaded = true;

	}

	resize() {

		console.log( "resize" );

		this.bolt.resizeCanvasToSize( vec2.fromValues( this.width, this.height ) );
		this.camera.updateProjection( this.canvas.width / this.canvas.height );
		//this.post.resize( this.canvas.width, this.canvas.height );
		this.sceneFBO.resize( this.canvas.width, this.canvas.height );

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {

		if ( ! this.assetsLoaded ) return;

		this.orbit.update();


		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.clear( 0, 0, 0, 0 );

		//this.sceneFBO.bind();

		this.bolt.disableDepth();
		this.bolt.draw( this.background );
		this.bolt.enableDepth();

		this.snow.render( { elapsed, delta } );

		this.monster.render();
		//this.sceneFBO.unbind();

		this.globe.render();


	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
