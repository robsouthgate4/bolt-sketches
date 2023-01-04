import { Bolt, EventListeners, Program, Texture2D } from "@bolt-webgl/core";

import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import { GL_UPDATE_TOPIC } from "@/common/events";
import { vec2, vec3, vec4 } from "gl-matrix";
export default class PBRProgram extends Program {
  bolt = Bolt.getInstance();
  eventListeners = EventListeners.getInstance();

  constructor({
    mapAlbedo,
    mapNormal,
    mapMetallic,
    mapRoughness,
    mapAO,
    mapEnvironment,
    mapIrradiance,
  }: {
    mapAlbedo?: Texture2D;
    mapNormal?: Texture2D;
    mapMetallic?: Texture2D;
    mapRoughness?: Texture2D;
    mapAO?: Texture2D;
    mapEnvironment?: Texture2D;
    mapIrradiance?: Texture2D;
  } = {}) {
    const flags = [];

    flags.push("#version 300 es");
    //flags.push( '#define USE_ALBEDO_MAP' );
    //flags.push( '#define USE_ROUGHNESS_MAP' );
    //flags.push( '#define USE_AO_MAP' );
    //flags.push( '#define USE_METALNESS_MAP' );
    //flags.push( '#define USE_NORMAL_MAP' );

    const definesString = flags.join("\n") + "\n";

    super(vertexShader, definesString + fragmentShader);
    this.eventListeners.listen(GL_UPDATE_TOPIC, this.render.bind(this));

    this.activate();

    this.setTexture("mapAlbedo", mapAlbedo);
    this.setTexture("mapRoughness", mapRoughness);
    this.setTexture("mapNormal", mapNormal);
    this.setTexture("mapAO", mapAO);

    this.setFloat("metalness", 0.0);
    this.setFloat("roughness", 0.0);
    this.setFloat("specular", 1);
    this.setFloat("exposure", 1);
    this.setFloat("normalHeight", 0.5);

    this.setVector4("albedoColor", vec4.fromValues(1, 0, 0, 1));
    this.setVector2("normalUVScale", vec2.fromValues(1.0, 1.0));

    this.setTexture("mapEnvironment", mapEnvironment);
    this.setTexture("mapIrradiance", mapIrradiance);
  }

  render() {
    this.activate();
    this.setVector3("cameraPosition", this.bolt.camera.transform.position);
  }
}
