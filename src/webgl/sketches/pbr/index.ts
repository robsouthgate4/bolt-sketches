

import Base from "@webgl/Base";
import Bolt, { Texture2D, CameraPersp, DrawSet, FBO, Program, Mesh, Node, LINEAR, REPEAT } from "@/webgl/libs/bolt";

import { vec3 } from "gl-matrix";
import Orbit from "@/webgl/modules/orbit";
import Post from "@/webgl/modules/post";
import config from "./config";
import { GL_RESIZE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import EventListeners from "@/webgl/modules/event-listeners";

import GLTFLoader from "@/webgl/modules/gltf-loader";
import Background from "./components/background";
import CopyPass from "@/webgl/modules/post/passes/CopyPass";


import Sphere from "@/webgl/modules/primitives/Sphere";
import PBRProgram from "./programs/pbr";
export default class extends Base {

	canvas: HTMLCanvasElement;
	camera: CameraPersp;
	assetsLoaded!: boolean;
	bolt: Bolt;
	post: Post;
	orbit: Orbit;
	config: any;
	eventListeners = EventListeners.getInstance();
	gtlfLoader: GLTFLoader;
	sphereGLB: DrawSet;
	sceneFBO: FBO;
	background: Background;
	normalTexture: Texture2D;
	sceneTexture: Texture2D;
	debugTriangle: CopyPass;
	debugProgram: Program;
	debugDrawSet: DrawSet;
	snowGlobeGLTF: Node;
	pbrProgram: PBRProgram;
	environment: Texture2D;
	unlitProgram: Program;
	sphere: DrawSet;
	irradiance: Texture2D;
	glbSphere: Node;


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
		this.bolt.init(
			this.canvas,
			{
				alpha: false,
				premultipliedAlpha: false,
				antialias: true,
				dpi: Math.min( 2, window.devicePixelRatio ),
				powerPreference: "high-performance"
			} );

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues( 0, 0, 5 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this.orbit = new Orbit( this.camera, {
			zoomSpeed: 0.1,
		} );

		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.setCamera( this.camera );
		this.bolt.enableDepth();

		this.initSketch();
		this.resize();


	}
	// construct the sketch
	async initSketch() {

		this.gtlfLoader = new GLTFLoader( this.bolt, false );

		this.glbSphere = await this.gtlfLoader.load( "/static/models/gltf/sphere.glb" );

		console.log( this.glbSphere );

		this.environment = new Texture2D( {
			imagePath: "/static/textures/hdr/office-radiance.png",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await this.environment.load();

		this.irradiance = new Texture2D( {
			imagePath: "/static/textures/hdr/office-irradiance.png",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await this.irradiance.load();

		// get roughness map texture2d
		const roughnessTexture = new Texture2D( {
			imagePath: "/static/textures/pbr/wood/roughness.jpg",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await roughnessTexture.load();

		// get ao map texture2d
		const aoTexture = new Texture2D( {
			imagePath: "/static/textures/pbr/wood/ao.jpg",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await aoTexture.load();

		// get normal map texture2d
		const normalTexture = new Texture2D( {
			imagePath: "/static/textures/pbr/wood/normal.jpg",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await normalTexture.load();

		// get color map texture2d
		const albedoColor = new Texture2D( {
			imagePath: "/static/textures/pbr/wood/color.jpg",
			minFilter: LINEAR,
			magFilter: LINEAR,
			wrapS: REPEAT,
			wrapT: REPEAT,
		} );

		await albedoColor.load();


		this.pbrProgram = new PBRProgram(
			{
				mapEnvironment: this.environment,
				mapIrradiance: this.irradiance,
				mapRoughness: roughnessTexture,
				mapAO: aoTexture,
				mapNormal: normalTexture,
				mapAlbedo: albedoColor,
			}
		);
		this.sphere = new DrawSet( new Mesh( new Sphere( { widthSegments: 128, heightSegments: 128 } ) ), this.pbrProgram );

		this.assetsLoaded = true;

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;

			this.resize();

		} );



	}

	resize() {

		this.bolt.resizeCanvasToDisplay();
		this.camera.updateProjection( window.innerWidth / window.innerHeight );

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {

		if ( ! this.assetsLoaded ) return;

		this.orbit.update();


		// draw scenery

		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.clear( 0, 0, 0, 1 );
		this.bolt.draw( this.sphere );



	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
