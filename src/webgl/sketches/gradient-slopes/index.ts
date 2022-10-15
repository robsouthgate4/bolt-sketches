

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, DrawSet, Mesh, ONE_MINUS_SRC_ALPHA, Program, SRC_ALPHA, TRIANGLES } from "@/webgl/libs/bolt";

import normalVertex from "./shaders/normal/normal.vert";
import normalFragment from "./shaders/normal/normal.frag";

import { vec2, vec3 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import { GUI } from "lil-gui";
import EaseNumber from "@/webgl/helpers/EaseNumber";
import Raycast from "@/webgl/modules/raycast";
import EventListeners from "@/webgl/modules/event-listeners";
import Ray from "@/webgl/modules/raycast/Ray";
import { GL_RESIZE_TOPIC, GL_TOUCH_MOVE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import GLTFLoader from "@/webgl/modules/gltf-loader";
import { hexToRgb, normalizeColor } from "@/utils";
import EaseVec3 from "@/webgl/helpers/EaseVector3";

interface DrawCall {
	ctx: CanvasRenderingContext2D,
	element: HTMLElement,
	drawState: DrawState,
	timeOffset: number
}

export default class extends Base {

	offscreenCanvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	camera!: CameraOrtho;
	assetsLoaded!: boolean;
	bolt: Bolt;
	orbit!: Orbit;
	mesh!: Mesh;
	drawSet!: DrawSet;
	gridDrawState!: DrawState;
	config: any;
	raycaster = new Raycast();
	eventListeners = EventListeners.getInstance();
	ray: Ray;
	frustumSize = 1;
	noiseSlopeFrequency = new EaseNumber( config.noiseSlopeFrequency.value, 0.1 );
	maxPeak = new EaseNumber( config.maxPeak.value, 0.1 );
	animationSpeed = new EaseNumber( config.animationSpeed.value, 0.2 );
	peakScale = new EaseVec3( config.peakScale.value.x, config.peakScale.value.y, config.peakScale.value.z, 0.1 );
	colorNoiseScale = new EaseVec3( config.colorNoiseScale.value.x, config.colorNoiseScale.value.y, config.colorNoiseScale.value.z, 0.1 );
	color1 = new EaseVec3( ...normalizeColor( hexToRgb( config.color1.value ) ), 0.1 );
	color2 = new EaseVec3( ...normalizeColor( hexToRgb( config.color2.value ) ), 0.1 );
	color3 = new EaseVec3( ...normalizeColor( hexToRgb( config.color3.value ) ), 0.1 );
	drawCalls: DrawCall[] = [];

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.offscreenCanvas = <HTMLCanvasElement>document.createElement( "canvas" );
		this.offscreenCanvas.width = this.width;
		this.offscreenCanvas.height = this.height;

		// initialize bolt
		this.bolt = Bolt.getInstance();
		this.bolt.init( this.offscreenCanvas, {
			antialias: true,
			dpi: Math.min( 2, window.devicePixelRatio ),
			powerPreference: "high-performance",
		} );

		this.bolt.enableScissor();

		this.gl = this.bolt.getContext();

		this.initScene();
		this.initSketch();
		this.initGUI();
		this.initListeners();

	}
	initListeners() {

		this.eventListeners.listen( GL_TOUCH_MOVE_TOPIC, ( e: any ) => {

			const { normalized } = e.detail;

			const scale = vec3.distance( this.camera.position, this.camera.target );

			this.ray = this.raycaster.generateRayFromCamera( normalized.x, normalized.y, this.camera );

		} );

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.resize();

		} );

	}

	// construct the scene
	initScene() {

		const w = window.innerWidth;
		const h = window.innerHeight;

		const ratio = w / h;

		this.camera = new CameraOrtho( {
			left: this.frustumSize * ratio / - 2,
			right: this.frustumSize * ratio / 2,
			bottom: - this.frustumSize / 2,
			top: this.frustumSize / 2,
			near: 0.01,
			far: 1000,
			position: vec3.fromValues( 0, 0, 1 ),
			target: vec3.fromValues( 0, 0, 0 )
		} );

		this.bolt.setCamera( this.camera );
		this.bolt.setViewPort( 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height );
		this.bolt.enableDepth();

		this.resize();

	}

	// construct the sketch
	async initSketch() {

		const gltfLoader = new GLTFLoader( this.bolt, true );
		await gltfLoader.load( "static/models/gltf/examples/grid/scene.glb" );

		const plane = gltfLoader.drawSetsFlattened[ 0 ].mesh;

		this.assetsLoaded = true;

		const canvas1 = document.createElement( "canvas" );
		const canvas1ctx = canvas1.getContext( "2d" )!;

		Object.assign( canvas1.style, {
			width: "100%",
			height: "100%"
		} );

		const div1 = document.createElement( "div" );
		div1.appendChild( canvas1 );

		Object.assign( div1.style, {
			position: "absolute",
			top: "50%",
			left: "15%",
			width: "500px",
			height: "500px",
			transform: "translate(0, -50%)",
			outline: "1px solid black"
		} );

		document.body.appendChild( div1 );

		const p = new Program( normalVertex, normalFragment );

		const m = plane.setDrawType( TRIANGLES );
		const gridDrawSet1 = new DrawSet( m, p );
		gridDrawSet1.transform.rotateX( Math.PI * 0.82 );

		const p2 = new Program( normalVertex, normalFragment );
		const gridDrawSet2 = new DrawSet( m, p2 );
		gridDrawSet2.transform.rotateX( Math.PI * 0.82 );

		const c = normalizeColor( [ 180, 228, 255 ] );
		const color1 = vec3.fromValues( c[ 0 ], c[ 1 ], c[ 2 ] );

		const drawState1 = new DrawState( this.bolt )
			.setDrawSet( gridDrawSet2 )
			.clear( 0, 0, 0, 1 )
			.uniformVector3( "color1", vec3.fromValues( color1[ 0 ], color1[ 1 ], color1[ 2 ] ) )
			.uniformVector3( "color2", vec3.fromValues( this.color2.x, this.color2.y, this.color2.z ) )
			.uniformVector3( "color3", vec3.fromValues( this.color3.x, this.color3.y, this.color3.z ) )
			.setViewport( 0, 0, canvas1.width, canvas1.height );

		this.drawCalls.push( {
			ctx: canvas1ctx,
			element: div1,
			drawState: drawState1,
			timeOffset: 3
		} );

		const canvas2 = document.createElement( "canvas" );
		const canvas2ctx = canvas2.getContext( "2d" )!;

		Object.assign( canvas2.style, {
			width: "100%",
			height: "100%"
		} );

		const div2 = document.createElement( "div" );
		div2.appendChild( canvas2 );

		Object.assign( div2.style, {
			position: "absolute",
			top: "50%",
			left: "50%",
			width: "500px",
			height: "500px",
			transform: "translate(0, -50%)",
			outline: "1px solid black"
		} );

		document.body.appendChild( div2 );

		const drawState2 = new DrawState( this.bolt )
			.setDrawSet( gridDrawSet1 )
			.clear( 0, 0, 0, 1 )
			.uniformVector3( "color1", vec3.fromValues( this.color1.x, this.color1.y, this.color1.z ) )
			.uniformVector3( "color2", vec3.fromValues( this.color2.x, this.color2.y, this.color2.z ) )
			.uniformVector3( "color3", vec3.fromValues( this.color3.x, this.color3.y, this.color3.z ) )
			.setViewport( 0, 0, canvas1.width, canvas1.height );

		this.drawCalls.push( {
			ctx: canvas2ctx,
			element: div2,
			drawState: drawState2,
			timeOffset: 0
		} );


	}

	initGUI() {

		const gui = new GUI();

		Object.entries( this.config ).forEach( ( [ key, value ] ) => {

			const folder = gui.addFolder( key );

			if ( key === "color1" || key === "color2" || key === "color3" ) {

				//@ts-ignore
				folder.addColor( value, "value" ).onChange( ( e: any ) => {

					this.config[ key ].value = e;
					const rgb = normalizeColor( hexToRgb( e ) );
					this[ key ].x = rgb[ 0 ];
					this[ key ].y = rgb[ 1 ];
					this[ key ].z = rgb[ 2 ];

				} );

			}

			if ( key === "noiseSlopeFrequency" ) {

				//@ts-ignore
				folder.add( value, "value", 0, 5 ).onChange( ( e: any ) => {

					this.config[ key ].value = e;
					this.noiseSlopeFrequency.value = e;

				} );

			}

			if ( key === "maxPeak" ) {

				//@ts-ignore
				folder.add( value, "value", 0, 2 ).onChange( ( e: any ) => {

					this.config[ key ].value = e;
					this.maxPeak.value = e;

				} );

			}


			if ( key === "peakScale" ) {

				//@ts-ignore
				folder.add( value.value, "x", 0, 2 ).onChange( ( e: any ) => {

					this.config[ key ].value.x = e;
					this.peakScale.x = e;

				} );
				//@ts-ignore
				folder.add( value.value, "y", 0, 2 ).onChange( ( e: any ) => {

					this.config[ key ].value.y = e;
					this.peakScale.y = e;

				} );
				//@ts-ignore
				folder.add( value.value, "z", 0, 2 ).onChange( ( e: any ) => {

					this.config[ key ].value.z = e;
					this.peakScale.z = e;

				} );

			}

			if ( key === "colorNoiseScale" ) {

				//@ts-ignore
				folder.add( value.value, "x", 0, 5 ).onChange( ( e: any ) => {

					this.config[ key ].value.x = e;
					this.colorNoiseScale.x = e;

				} );
				//@ts-ignore
				folder.add( value.value, "y", 0, 5 ).onChange( ( e: any ) => {

					this.config[ key ].value.y = e;
					this.colorNoiseScale.y = e;

				} );
				//@ts-ignore
				folder.add( value.value, "z", 0, 5 ).onChange( ( e: any ) => {

					this.config[ key ].value.z = e;
					this.colorNoiseScale.z = e;

				} );

			}

			if ( key === "animationSpeed" ) {

				//@ts-ignore
				folder.add( value, "value", 0, 2 ).onChange( ( e: any ) => {

					this.config[ key ].value = e;
					this.animationSpeed.value = e;

				} );

			}

		} );

	}

	resize() {

		this.bolt.resizeCanvasToDisplay();

		const aspect = this.gl.canvas.width / this.gl.canvas.height;

		this.camera.left = this.frustumSize * aspect / - 2;
		this.camera.right = this.frustumSize * aspect / 2;
		this.camera.bottom = - this.frustumSize / 2;
		this.camera.top = this.frustumSize / 2;

		this.camera.updateProjection();

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {

		if ( ! this.assetsLoaded ) return;

		this.drawCalls.forEach( ( drawCall: DrawCall ) => {

			const { drawState, element, ctx, timeOffset } = drawCall;

			const rect = element.getBoundingClientRect();
			const { width, height } = rect;

			if ( ctx.canvas.width !== width || ctx.canvas.height !== height ) {

				ctx.canvas.width = width;
				ctx.canvas.height = height;

			}

			this.bolt.resizeCanvasToSize( vec2.fromValues( width, height ) );

			const gl = this.bolt.getContext();

			const aspect = ctx.canvas.width / ctx.canvas.height;

			this.camera.left = this.frustumSize * aspect / - 2;
			this.camera.right = this.frustumSize * aspect / 2;
			this.camera.bottom = - this.frustumSize / 2;
			this.camera.top = this.frustumSize / 2;

			this.camera.updateProjection();

			drawState
				.uniformFloat( "time", elapsed + timeOffset )
				.uniformFloat( "animationSpeed", this.animationSpeed.value )
				.uniformFloat( "noiseSlopeFrequency", this.noiseSlopeFrequency.value )
				.uniformFloat( "maxPeak", this.maxPeak.value )
				.uniformVector3( "peakScale", vec3.fromValues( this.peakScale.x, this.peakScale.y, this.peakScale.z ) )
				.uniformVector3( "colorNoiseScale", vec3.fromValues( this.colorNoiseScale.x, this.colorNoiseScale.y, this.colorNoiseScale.z ) )
				.uniformVector2( "resolution", vec2.fromValues( ctx.canvas.width, ctx.canvas.height ) )
				.uniformVector3( "color2", vec3.fromValues( this.color2.x, this.color2.y, this.color2.z ) )
				.uniformVector3( "color3", vec3.fromValues( this.color3.x, this.color3.y, this.color3.z ) )
				.setScissor( 0, 0, width, height )
				.setViewport( 0, 0, width, height )
				.draw();

			ctx.globalCompositeOperation = "copy";
			ctx.drawImage(
				gl.canvas,
				0, gl.canvas.height - height, width, height, // src
				0, 0, width, height // dst
			);

		} );

	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
