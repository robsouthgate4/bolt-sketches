

import Base from "@webgl/Base";
import Bolt, { Texture2D, CameraPersp, DrawSet, FLOAT, RGBA16F, RGBA, FBO, COLOR_ATTACHMENT0, RBO, Program, Mesh, Node, TextureCube, LINEAR } from "@/webgl/libs/bolt";

import { vec3 } from "gl-matrix";
import Orbit from "@/webgl/modules/orbit";
import Post from "@/webgl/modules/post";
import config from "./config";
import { GL_RESIZE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import EventListeners from "@/webgl/modules/event-listeners";

import Snow from "./components/snow";
import GLTFLoader from "@/webgl/modules/gltf-loader";
import GlobeProgram from "./programs/globe";
import parseHdr from "@/webgl/modules/hdr-parse";
import Monster from "./components/monster";
import Background from "./components/background";
import CopyPass from "@/webgl/modules/post/passes/CopyPass";

import debugVertexShader from "./programs/debug/shaders/vertexShader.glsl";
import debugFragmentShader from "./programs/debug/shaders/fragmentShader.glsl";


import SnowProgram from "./programs/snow";
import UnlitProgram from "./programs/unlit";
export default class extends Base {

	canvas: HTMLCanvasElement;
	camera: CameraPersp;
	assetsLoaded!: boolean;
	bolt: Bolt;
	post: Post;
	orbit: Orbit;
	config: any;
	eventListeners = EventListeners.getInstance();
	snow: Snow;
	gtlfLoader: GLTFLoader;
	sphereGLB: DrawSet;
	globe: GlobeProgram;
	monster: Monster;
	sceneFBO: FBO;
	background: Background;
	gBuffer: FBO;
	normalTexture: Texture2D;
	sceneTexture: Texture2D;
	debugTriangle: CopyPass;
	debugProgram: Program;
	debugDrawSet: DrawSet;
	snowGlobeGLTF: Node;
	globeProgram: GlobeProgram;
	environmentHDRI: Texture2D;
	globeSnowNode!: Node;
	globeGlassNode!: Node;
	globeBaseNode!: Node;
	floorNode!: Node;
	snowProgram: SnowProgram;
	innerGlobeGroup: Node;
	unlitProgram: Program;


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
				dpi: Math.min( 2, window.devicePixelRatio ), powerPreference: "high-performance"
			} );

		this.camera = new CameraPersp( {
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues( 0, 0.5, 5 ),
			target: vec3.fromValues( 0, 0.5, 0 ),
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

		this.gBuffer = new FBO( { width: this.canvas.width, height: this.canvas.height, depth: true } );
		this.sceneTexture = new Texture2D( { width: this.canvas.width, height: this.canvas.height } );

		this.gBuffer.bind();
		this.gBuffer.addAttachment( this.sceneTexture, COLOR_ATTACHMENT0 + 1 );
		this.gBuffer.setDrawBuffers();
		this.gBuffer.unbind();

		this.snow = new Snow();
		await this.snow.init();

		const irradiance = new TextureCube( {
			imagePath: "/static/textures/cubeMaps/irradiance/",
			files: {
				px: "px.jpeg",
				nx: "nx.jpeg",
				py: "py.jpeg",
				ny: "ny.jpeg",
				pz: "pz.jpeg",
				nz: "nz.jpeg"
			},
			generateMipmaps: false,
			minFilter: LINEAR,
			magFilter: LINEAR
		} );


		await irradiance.load();

		const radiance = new TextureCube( {
			imagePath: "/static/textures/cubeMaps/radiance/",
			files: {
				px: "px.jpeg",
				nx: "nx.jpeg",
				py: "py.jpeg",
				ny: "ny.jpeg",
				pz: "pz.jpeg",
				nz: "nz.jpeg"
			},
			generateMipmaps: false,
			minFilter: LINEAR,
			magFilter: LINEAR
		} );

		await radiance.load();

		this.gtlfLoader = new GLTFLoader( this.bolt, false, { irradianceMap: irradiance, radianceMap: radiance } );

		const hdrLoad = await fetch( "/static/textures/hdr/snow.hdr" );
		const hdriBuffer = await hdrLoad.arrayBuffer();
		const hdrParsed = parseHdr( hdriBuffer );

		this.environmentHDRI = new Texture2D( {
			internalFormat: RGBA16F,
			format: RGBA,
			type: FLOAT,
			generateMipmaps: false } );

		this.environmentHDRI.setFromData( hdrParsed.data, hdrParsed.shape[ 0 ], hdrParsed.shape[ 1 ] );

		this.snowGlobeGLTF = await this.gtlfLoader.load( "/static/models/gltf/snowGlobe5.glb" );

		this.globeProgram = new GlobeProgram( { mapEnv: this.environmentHDRI } );
		this.snowProgram = new SnowProgram( { mapEnv: this.environmentHDRI } );
		this.unlitProgram = new UnlitProgram();
		this.innerGlobeGroup = new Node();

		this.snowGlobeGLTF.traverse( ( node ) => {


			if ( node.name === "Floor" ) {

				if ( node.children.length > 0 ) {

					this.floorNode = node;
					this.floorNode.draw = false;

				} else {

					const ds = node.children[ 0 ];
					node.draw = false;

					node.name = "InnerGlobeRenderable";

					const orginalProgram = ds.program;
					ds.program = new UnlitProgram();
					ds.program.activate();
					ds.program.transparent = true;

					if ( orginalProgram.textures.length > 0 ) {

						ds.program.activate();
						ds.program.setTexture( "mapAlbedo", orginalProgram.textures[ 0 ].texture );

					}


				}

			}

			if ( node.name === "Base" ) {

				if ( node.children.length > 0 ) {

					this.globeBaseNode = node;
					this.globeBaseNode.draw = false;

				}

			}

			if ( node.name === "Leaves" || node.name === "Leaves1" ) {

				const ds = node.children[ 0 ];
				node.draw = false;

				node.name = "InnerGlobeRenderable";

				const orginalProgram = ds.program;
				ds.program = new UnlitProgram();
				ds.program.activate();
				ds.program.transparent = true;

				if ( orginalProgram.textures.length > 0 ) {

					ds.program.activate();
					ds.program.setTexture( "mapAlbedo", orginalProgram.textures[ 0 ].texture );

				}


				node.setParent( this.innerGlobeGroup );


			}

			if ( node.name === "Snow" ) {

				node.draw = false;
				node.children[ 0 ].program = this.snowProgram;
				this.globeSnowNode = node;

			}


			if ( node.name === "Tree" || node.name === "Tree1" ) {

				node.name = "InnerGlobeRenderable";

				if ( node instanceof DrawSet ) {

					const orginalProgram = node.program;
					node.draw = false;
					node.program = new UnlitProgram();

					if ( orginalProgram.textures.length > 0 ) {

						node.program.activate();
						node.program.setTexture( "mapAlbedo", orginalProgram.textures[ 0 ].texture );

					}

				}

				node.setParent( this.innerGlobeGroup );

			}

			if ( node.name === "Rocks" ) {

				const ds = node.children[ 0 ];
				node.draw = false;

				node.name = "InnerGlobeRenderable";

				const orginalProgram = ds.program;
				ds.program = new UnlitProgram();

				if ( orginalProgram.textures.length > 0 ) {

					ds.program.activate();
					ds.program.setTexture( "mapAlbedo", orginalProgram.textures[ 0 ].texture );

				}


				node.setParent( this.innerGlobeGroup );


			}


			if ( node.name.includes( "Glass" ) ) {

				this.globeGlassNode = node;
				this.globeGlassNode.draw = false;

				const ds = this.globeGlassNode.children[ 0 ] as DrawSet;
				ds.program = this.globeProgram;

				this.snow.particleDrawState.uniformVector3( "offset", this.globeGlassNode.transform.position );
				this.snow.particleDrawState.uniformVector3( "scale", this.globeGlassNode.transform.scale );

			}

		} );

		const environmentTexture = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/trees.png" } );
		await environmentTexture.load();

		this.background = new Background( { map: environmentTexture } );
		this.background.transform.position = vec3.fromValues( 0, 0, - 2 );

		const monsterColor = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/monster-color.png" } );
		await monsterColor.load();

		const monsterDepth = new Texture2D( { imagePath: "/static/textures/sketches/snow-globe/monster-depth.png" } );
		await monsterDepth.load();

		this.assetsLoaded = true;

		this.monster = new Monster( { map: monsterColor, mapDepth: monsterDepth } );

		this.eventListeners.listen( GL_RESIZE_TOPIC, ( e: any ) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;

			this.resize();

		} );

		const triangleVertices = [
    		- 1, - 1, 0, - 1, 4, 0, 4, - 1, 0
    	];

    	const triangleIndices = [
    		2, 1, 0
    	];

    	const fullScreenTriangle = new Mesh( {
    		positions: triangleVertices,
    		indices: triangleIndices
    	} );

		const debugProgram = new Program( debugVertexShader, debugFragmentShader );
		debugProgram.activate();
		debugProgram.setTexture( "map", this.sceneTexture );

		this.debugDrawSet = new DrawSet( fullScreenTriangle, debugProgram );



	}

	resize() {

		this.bolt.resizeCanvasToDisplay();

		this.camera.updateProjection( window.innerWidth / window.innerHeight );
		this.gBuffer.resize( this.width, this.height );

	}

	earlyUpdate( elapsed: number, delta: number ) {

		return;

	}

	update( elapsed: number, delta: number ) {

		if ( ! this.assetsLoaded ) return;

		this.orbit.update();

		this.debugDrawSet.program.activate();
		this.debugDrawSet.program.setTexture( "mapNormal", this.normalTexture );
		this.debugDrawSet.program.setTexture( "map", this.sceneTexture );

		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );

		// render to back buffer
		{

			this.gBuffer.bind();

			this.bolt.clear( 0, 0, 0, 1 );

			// draw background
			this.bolt.disableDepth();
			this.bolt.draw( this.background );
			this.bolt.enableDepth();

			this.innerGlobeGroup.traverse( ( node: Node ) => {

				if ( node.name !== "InnerGlobeRenderable" ) return;

				node.draw = true;
				this.bolt.draw( node );

			} );

			this.globeSnowNode.draw = true;
			this.bolt.draw( this.globeSnowNode );
			this.globeSnowNode.draw = false;

			this.monster.render();

			this.snow.render( { elapsed, delta } );

			this.gBuffer.unbind();

			this.innerGlobeGroup.traverse( ( node: Node ) => {

				if ( node.name !== "InnerGlobeRenderable" ) return;

				node.draw = false;

			} );


			this.bolt.clear( 0, 0, 0, 1 );

		}


		// draw scenery

		this.bolt.setViewPort( 0, 0, this.canvas.width, this.canvas.height );
		this.bolt.clear( 0, 0, 0, 1 );

		this.bolt.disableDepth();
		this.bolt.draw( this.background );
		this.bolt.enableDepth();

		this.bolt.draw( this.snowGlobeGLTF );

		this.globeProgram.activate();
		this.globeProgram.setTexture( "mapInner", this.sceneTexture );

		this.globeGlassNode.draw = true;
		this.bolt.draw( this.globeGlassNode );
		this.globeGlassNode.draw = false;

		this.globeBaseNode.draw = true;
		this.bolt.draw( this.globeBaseNode );
		this.globeBaseNode.draw = false;

		this.floorNode.draw = true;
		this.bolt.draw( this.floorNode );
		this.floorNode.draw = false;


	}

	lateUpdate( elapsed: number, delta: number ) {

		return;

	}

}
