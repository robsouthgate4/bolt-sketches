import Bolt, { BACK, ONE, ONE_MINUS_SRC_ALPHA, Program, Texture2D } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import EventListeners from "@/webgl/modules/event-listeners";
import { GL_UPDATE_TOPIC } from "@/webgl/modules/event-listeners/constants";

export default class SnowProgram extends Program {

	bolt = Bolt.getInstance();
	eventListeners = EventListeners.getInstance();

	constructor( { mapEnv }: { mapEnv: Texture2D } ) {

		super( vertexShader, fragmentShader );

		this.activate();
		this.setTexture( "mapEnv", mapEnv );
		this.eventListeners.listen( GL_UPDATE_TOPIC, this.render.bind( this ) );

	}

	render() {

		this.activate();
		this.setVector3( "cameraPosition", this.bolt.camera.transform.position );

	}


}
