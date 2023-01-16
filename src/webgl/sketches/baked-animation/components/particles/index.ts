import { vec3 } from "gl-matrix";

import { getRandomPointInSphere } from "../../utils";
import {
  Bolt,
  CLAMP_TO_EDGE,
  DrawSet,
  FBO,
  FLOAT,
  HALF_FLOAT,
  Mesh,
  NEAREST,
  POINTS,
  Program,
  RGBA,
  RGBA16F,
  RGBA32f,
  Texture2D,
  EventListeners,
  FBOSim,
  DrawState,
  FBOSwapDefinition,
} from "@bolt-webgl/core";
import EaseVec3 from "@/webgl/helpers/EaseVector3";

import velocityFragmentShader from "./shaders/simulation/velocity.frag";
import positionFragmentShader from "./shaders/simulation/position.frag";

import particlesVertexShader from "./shaders/particles/particles.vert";
import particlesFragmentShader from "./shaders/particles/particles.frag";

export default class Particles {
  private _particleDrawState!: DrawState;
  private _bolt = Bolt.getInstance();
  private _gravity = vec3.fromValues(0, 0, 0);
  private _vortexAxis = new EaseVec3(0, 0.008, 0, 0.1);
  private _turbulence = 1;
  private _force = vec3.fromValues(0, 0, 0);
  private _eventListeners = EventListeners.getInstance();
  private _fbosim!: FBOSim;
  private _velocityProgram: Program | undefined;
  private _positionProgram: Program | undefined;
  private _velocityDefiniton: FBOSwapDefinition;
  private _positionDefiniton: FBOSwapDefinition;
  private _count!: number;
  private _initPosition!: Texture2D;
  private _isIos!: boolean;
  private _particleSettings: {
    gravityX: number;
    gravityY: number;
    gravityZ: number;
    turbulence: number;
    particleScale: number;
    vortexAxisX: number;
    vortexAxisY: number;
    vortexAxisZ: number;
  };

  constructor() {
    this._particleSettings = {
      gravityX: this._gravity[0],
      gravityY: this._gravity[1],
      gravityZ: this._gravity[2],
      turbulence: this._turbulence,
      particleScale: 1,
      vortexAxisX: this._vortexAxis.x,
      vortexAxisY: this._vortexAxis.y,
      vortexAxisZ: this._vortexAxis.z,
    };
  }

  init() {
    this._fbosim = new FBOSim(this._bolt, false);

    const size = Math.floor(Math.sqrt(10000));

    this._count = size * size;

    // required for using float and half float textures
    this._isIos = /(iPad|iPhone|iPod)/g.test(window.navigator.userAgent);

    const posArray = new Float32Array(this._count * 4);

    for (let i = 0; i < this._count; i++) {
      const pos = getRandomPointInSphere(1);

      const yOffset = 1.5;

      if (pos[1] < -0.4) pos[1] = 0.1;

      const stride = i * 4;

      posArray[stride] = pos[0];
      posArray[stride + 1] = pos[1] + yOffset;
      posArray[stride + 2] = pos[2];
      posArray[stride + 3] = Math.max(Math.random() * 3.0, 1.0);
    }

    this._initPosition = new Texture2D({
      width: size,
      height: size,
      internalFormat: RGBA32f,
      format: RGBA,
      type: FLOAT,
      minFilter: NEAREST,
      magFilter: NEAREST,
      generateMipmaps: false,
    });

    this._initPosition.setFromData(posArray, size, size);

    const velocity = this._createDoubleFBO({
      size,
      name: "velocity",
    });

    const position = this._createDoubleFBO({
      size,
      name: "position",
    });

    this._velocityDefiniton = {
      read: velocity.read,
      write: velocity.write,
      requiresSwap: true,
      shader: velocityFragmentShader,
      passName: "velocity",
    };

    this._positionDefiniton = {
      read: position.read,
      write: position.write,
      requiresSwap: true,
      shader: positionFragmentShader,
      passName: "position",
      initialTexture: this._initPosition,
    };

    this._fbosim.bindFBOs([this._positionDefiniton, this._velocityDefiniton]);

    this._velocityProgram = this._fbosim.getProgram("velocity");

    if (this._velocityProgram) {
      this._velocityProgram.activate();
      this._velocityProgram.setFloat("time", 0);
      this._velocityProgram.setFloat("turbulence", this._turbulence);
      this._velocityProgram.setVector3(
        "vortexAxis",
        vec3.fromValues(
          this._particleSettings.vortexAxisX,
          this._particleSettings.vortexAxisY,
          this._particleSettings.vortexAxisZ
        )
      );
    }

    this._positionProgram = this._fbosim.getProgram("position");

    if (this._positionProgram) {
      this._positionProgram.activate();
      this._positionProgram.setFloat("globalSpeed", 1);
      this._positionProgram.setVector3(
        "vortexAxis",
        vec3.fromValues(
          this._particleSettings.vortexAxisX,
          this._particleSettings.vortexAxisY,
          this._particleSettings.vortexAxisZ
        )
      );
    }

    const positions: number[] = [];
    const references: number[] = [];
    const randoms: number[] = [];
    const scales: number[] = [];

    for (let i = 0; i < this._count; i++) {
      positions.push(0, 0, 0);
      randoms.push(Math.random());

      // get random scales with weight towards smaller values
      const scale = Math.pow(Math.random(), 2.0) * 0.5 + 0.5;
      scales.push(scale);

      const referenceX = (i % size) / size;
      const referenceY = Math.floor(i / size) / size;
      references.push(referenceX, referenceY);
    }

    const pp = new Program(particlesVertexShader, particlesFragmentShader);

    const pointMesh = new Mesh({
      positions,
    }).setDrawType(POINTS);

    pointMesh.setAttribute(new Float32Array(references), 2, 4);
    pointMesh.setAttribute(new Float32Array(randoms), 1, 3);
    pointMesh.setAttribute(new Float32Array(scales), 1, 5);

    const particleDrawSet = new DrawSet(pointMesh, pp);

    // prepare draw state
    this._particleDrawState = new DrawState(this._bolt)
      .setDrawSet(particleDrawSet)
      .uniformTexture("mapVelocity", velocity.read.targetTexture)
      .uniformTexture("mapPosition", position.read.targetTexture)
      .uniformFloat("particleScale", this._particleSettings.particleScale);

    this._initGUI();

    this._initListeners();
  }

  _initListeners() {
    return;
  }

  _initGUI() {
    // this._gui = GlobalGui.getInstance();
    // this._gui
    //   .add(this._particleSettings, "particleScale", 1, 6, 0.001)
    //   .name("particle Scale")
    //   .onChange((value: number) => {
    //     this._particleDrawState.uniformFloat("particleScale", value);
    //   });
  }

  addForce(force: vec3) {
    this._force[0] = force[0];
    this._force[1] = force[1];
    this._force[2] = force[2];
  }

  addTurbulence(turbulence: number) {
    this._turbulence = turbulence;
  }

  setVortexAxis(axis: vec3) {
    this._vortexAxis.x = axis[0];
    this._vortexAxis.y = axis[1];
    this._vortexAxis.z = axis[2];
  }

  render({ elapsed, delta }: { elapsed: number; delta: number }) {
    this._particleDrawState
      .uniformFloat("time", elapsed)
      .uniformTexture("mapPosition", this._positionDefiniton.read.targetTexture)
      .draw();

    if (this._velocityProgram) {
      this._velocityProgram.activate();
      this._velocityProgram.setFloat("time", elapsed);
      this._velocityProgram.setFloat("delta", delta);
      this._velocityProgram.setFloat("turbulence", this._turbulence);
      this._velocityProgram.setVector3("gravity", this._gravity);
      this._velocityProgram.setVector3("force", this._force);
      this._velocityProgram.setTexture(
        "position",
        this._positionDefiniton.read.targetTexture
      );
      this._velocityProgram.setTexture(
        "velocity",
        this._velocityDefiniton.read.targetTexture
      );
    }

    if (this._positionProgram) {
      this._positionProgram.activate();
      this._positionProgram.setFloat("delta", delta);
      this._positionProgram.setFloat("time", elapsed);
      this._positionProgram.setVector3(
        "vortexAxis",
        vec3.fromValues(
          this._vortexAxis.x,
          this._vortexAxis.y,
          this._vortexAxis.z
        )
      );
      this._positionProgram.setTexture(
        "position",
        this._positionDefiniton.read.targetTexture
      );
      this._positionProgram.setTexture(
        "velocity",
        this._velocityDefiniton.read.targetTexture
      );
    }

    vec3.scale(this._force, this._force, 0.1);

    this._turbulence *= 0.99;
    this._turbulence = Math.max(this._turbulence, 1.0);

    this._fbosim.compute();
  }

  public get particleDrawState(): DrawState {
    return this._particleDrawState;
  }

  _createFBO({ size = 1, name = "fbo" }) {
    return new FBO({
      width: size,
      height: size,
      depth: false,
      type: this._isIos ? HALF_FLOAT : FLOAT,
      internalFormat: this._isIos ? RGBA16F : RGBA32f,
      format: RGBA,
      name: name,
      minFilter: NEAREST,
      magFilter: NEAREST,
      wrapS: CLAMP_TO_EDGE,
      wrapT: CLAMP_TO_EDGE,
      generateMipmaps: false,
    });
  }

  _createDoubleFBO({ size = 1, name = "fbo" }) {
    const read = this._createFBO({ size, name: name + "1" });
    const write = this._createFBO({ size, name: name + "2" });
    return { read, write };
  }
}
