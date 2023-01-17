import Base from "@webgl/Base";
import {
  Bolt,
  CameraPersp,
  Program,
  Node,
  Orbit,
  EventListeners,
  DrawSet,
  Cube,
  Mesh,
  Texture2D,
  LINEAR,
  REPEAT,
} from "@bolt-webgl/core";

import { mat4, quat, vec3 } from "gl-matrix";
import config from "./config";

import GLTFLoader from "./libs/gltf-loader";

import BakedAnimation from "./libs/baked-animation";
import Floor from "@/webgl/drawSets/floor";

import normalVertexShder from "./programs/normal/shaders/vertexShader.glsl";
import normalFragmentShader from "./programs/normal/shaders/fragmentShader.glsl";
import PBRProgram from "./programs/pbr";

export default class extends Base {
  canvas: HTMLCanvasElement;
  camera: CameraPersp;
  assetsLoaded!: boolean;
  bolt: Bolt;
  orbit: Orbit;
  config: any;
  eventListeners = EventListeners.getInstance();
  gtlfLoader: GLTFLoader;
  debugProgram: Program;
  scene: Node;

  private _characterAnimation: BakedAnimation;
  private floor: Floor;
  private _joints: Node[];
  private _cubeDS: DrawSet;
  private root: Node;
  private _testJoint: Node;
  private _quad: DrawSet;
  private _texture: Texture2D;
  private _quad2: DrawSet;
  private _texture2: Texture2D;
  environment: Texture2D;
  irradiance: Texture2D;
  private _cubeDS2: DrawSet;
  gl: WebGL2RenderingContext;
  private _loc1: WebGLUniformLocation;
  private _loc2: WebGLUniformLocation;

  constructor() {
    super();

    this.config = config;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas = <HTMLCanvasElement>document.getElementById("experience");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.eventListeners.setBoundElement(this.canvas);

    this.bolt = Bolt.getInstance();
    this.bolt.init(this.canvas, {
      antialias: true,
      dpi: Math.min(2, window.devicePixelRatio),
      powerPreference: "high-performance",
    });

    this.gl = this.bolt.getContext();

    this.camera = new CameraPersp({
      aspect: this.canvas.width / this.canvas.height,
      fov: 45,
      near: 0.1,
      far: 1000,
      position: vec3.fromValues(2, 1, 2),
      target: vec3.fromValues(0, 1, 0),
    });

    this.orbit = new Orbit(this.camera, {
      zoomSpeed: 0.1,
      maxRadius: 10,
      minRadius: 2,
      rotateSpeed: 1,
      ease: 0.1,
    });

    this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
    this.bolt.setCamera(this.camera);
    this.bolt.enableDepth();

    this.initSketch();
    this.resize();
  }
  // construct the sketch§
  async initSketch() {
    this.gtlfLoader = new GLTFLoader(this.bolt, false);

    this.floor = new Floor(20);

    this.irradiance = new Texture2D({
      imagePath: "/static/textures/hdr/studio_small_09_2k-diffuse-RGBM.png",
      minFilter: LINEAR,
      magFilter: LINEAR,
      wrapS: REPEAT,
      wrapT: REPEAT,
      flipY: false,
    });

    await this.irradiance.load();

    this.environment = new Texture2D({
      imagePath: "/static/textures/hdr/studio_small_09_2k-specular-RGBM.png",
      minFilter: LINEAR,
      magFilter: LINEAR,
      wrapS: REPEAT,
      wrapT: REPEAT,
      flipY: false,
    });

    await this.environment.load();

    this.scene = await this.gtlfLoader.load(
      "/static/models/gltf/examples/character/running-woman.glb"
    );

    this.scene.traverse((node: Node) => {
      if (node instanceof DrawSet) {
        const prog = new PBRProgram({
          mapEnvironment: this.environment,
          mapIrradiance: this.irradiance,
        });
        node.program = prog;
        node.program.name = "pbr program";
      }
      if (node.isJoint) {
        if (node.name === "mixamorig:LeftFoot") {
          this._testJoint = node;
          console.log(this._testJoint);
        }
      }
    });

    this._joints = [];

    this.root = new Node();

    const cubeGeo = new Cube();
    const cubeProg = new Program(normalVertexShder, normalFragmentShader);

    this._cubeDS = new DrawSet(new Mesh(cubeGeo), cubeProg);
    this._cubeDS.transform.scale = vec3.fromValues(0.2, 0.2, 0.2);

    const gltfAnimations = this.gtlfLoader.animations;

    this._characterAnimation = new BakedAnimation(gltfAnimations);
    this._characterAnimation.runAnimation("Armature|mixamo.com|Layer0");
    this.assetsLoaded = true;
  }

  resize() {
    this.bolt.resizeCanvasToDisplay();
    this.camera.updateProjection(window.innerWidth / window.innerHeight);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  earlyUpdate(elapsed: number, delta: number) {
    return;
  }

  update(elapsed: number, delta: number) {
    if (!this.assetsLoaded) return;

    this.orbit.update();
    this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
    this.bolt.clear(0.2, 0.2, 0.2, 1);

    this._characterAnimation.update(elapsed, delta);

    const position = vec3.create();
    mat4.getTranslation(position, this._testJoint.modelMatrix);

    const rotation = quat.create();
    mat4.getRotation(rotation, this._testJoint.modelMatrix);

    this._cubeDS.transform.position = position;
    this._cubeDS.transform.quaternion = rotation;

    this.bolt.draw(this.scene);
    //this.bolt.draw(this._cubeDS);
  }

  lateUpdate(elapsed: number, delta: number) {
    return;
  }
}
