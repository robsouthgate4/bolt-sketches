import Bolt, { BACK, ONE, ONE_MINUS_SRC_ALPHA, Program, Texture2D } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/basic/basic.vert";
import fragmentShader from "./shaders/basic/basic.frag";
import EventListeners from "@/webgl/modules/event-listeners";
import { GL_UPDATE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import { vec2 } from "gl-matrix";

export default class GlobeProgram extends Program {

	bolt = Bolt.getInstance();
	eventListeners = EventListeners.getInstance();

	constructor( { mapEnv }: { mapEnv: Texture2D } ) {

		super( vertexShader, fragmentShader );

		this.activate();
		this.transparent = true;
		this.cullFace = BACK;
		this.blendFunction = { src: ONE, dst: ONE_MINUS_SRC_ALPHA };
		this.setTexture( "mapEnv", mapEnv );

		this.eventListeners.listen( GL_UPDATE_TOPIC, this.render.bind( this ) );

	}

	render() {

		this.activate();
		this.setVector2( "resolution", vec2.fromValues( this.bolt.viewport.width, this.bolt.viewport.height ) );
		this.setVector3( "cameraPosition", this.bolt.camera.transform.position );

	}


}
