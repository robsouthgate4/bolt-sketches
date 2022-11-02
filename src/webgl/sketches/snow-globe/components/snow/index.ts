import Bolt, { CLAMP_TO_EDGE, DrawSet, DYNAMIC_DRAW, FLOAT, Mesh, NEAREST, POINTS, Program, STATIC_DRAW, Texture2D, VBO } from "@/webgl/libs/bolt";
import DrawState from "@/webgl/modules/draw-state";
import Plane from "@/webgl/modules/primitives/Plane";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import pako from "pako";
import config from "../../config";

import simulationVertexShader from "./shaders/simulation/simulation.vert";
import simulationFragmentShader from "./shaders/simulation/simulation.frag";

import particlesVertexShader from "./shaders/particles/particles.vert";
import particlesFragmentShader from "./shaders/particles/particles.frag";

import debugVertexShader from "./shaders/basic/basic.vert";
import debugFragmentShader from "./shaders/basic/basic.frag";

export default class Snow {

	particleDrawState: DrawState;
	config: any;
	pointCount = 128 * 128;
	transformFeedback: TransformFeedback;
	simulationProgramLocations: {
		oldPosition: number;
		oldVelocity: number;
		oldLifeTime: number;
		initPosition: number;
		initLifeTime: number;
		random: number;
		groupID: number;
		particleID: number; };
	pointCloud: Float32Array;
	volumeNormalTexture: Texture2D;
	volumeDistanceTexture: Texture2D;
	assetsLoaded: boolean;
	particleProgram: Program;
	simulationProgram: Program;
	bolt = Bolt.getInstance();
	canvas: HTMLCanvasElement;

	constructor() {

		this.config = config;
		this.canvas = this.bolt.getContext().canvas;


	}

	async init() {

		const pointsBuf = await fetch( "/static/models/ply/toy-no-col.buf" );
		const pointsAB = await pointsBuf.arrayBuffer();

		// uncompress gzip data
		const pointsParsed = pako.inflate( pointsAB, { to: 'string' } ).split( "," ).map( ( v: string ) => {

			if ( v.includes( "[" ) ) {

				return parseFloat( v.replace( "[", "" ) );

			}

			return parseFloat( v );

		} );

		this.pointCloud = new Float32Array( pointsParsed );

		this.volumeNormalTexture = new Texture2D( {
			imagePath: "/static/textures/volumes/sdf-normal-a.png",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
			minFilter: NEAREST,
			magFilter: NEAREST,
			generateMipmaps: false,
		} );

		await this.volumeNormalTexture.load();

		this.volumeDistanceTexture = new Texture2D( {
			imagePath: "/static/textures/volumes/sdf-distance-a.png",
			wrapS: CLAMP_TO_EDGE,
			wrapT: CLAMP_TO_EDGE,
			minFilter: NEAREST,
			magFilter: NEAREST,
			generateMipmaps: false,
		} );

		await this.volumeDistanceTexture.load();

		this.assetsLoaded = true;

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

			const normal = Math.random() * 2 - 1;
			const scale = ( Math.random() * 0.5 + 0.5 ) + 0.1;

			scales.push( scale );
			normals.push( normal, normal, normal );

			offsets.push( ( Math.random() * 2 - 1 ) * 0.3, ( Math.random() * 0.1 ), ( Math.random() * 0.1 ) );

			velocities.push( 0, 0, 0 );

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

		const debugProgram = new Program( debugVertexShader, debugFragmentShader );

		debugProgram.activate();
		debugProgram.setTexture( 'mapNormal', this.volumeNormalTexture );
		debugProgram.setTexture( 'mapDistance', this.volumeDistanceTexture );

		const debugMesh = new Mesh( new Plane() );
		const debugDrawSet = new DrawSet( debugMesh, debugProgram );
		//debugDrawSet.transform.scaleX = 2;
		debugDrawSet.transform.positionY = 0;

		//debugDrawSet.setParent( particleDrawSet );

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
			.setViewport( 0, 0, this.canvas.width, this.canvas.height );

	}

	render( { elapsed, delta }: { elapsed: number, delta: number } ) {

		this.particleDrawState
			.uniformFloat( "time", elapsed )
			.draw();


		this.transformFeedback.compute( this.simulationProgram );
		this.simulationProgram.setFloat( "time", elapsed );
		this.simulationProgram.setFloat( "delta", delta );

	}

}
