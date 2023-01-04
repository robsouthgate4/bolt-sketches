import { DrawSet, Mesh, Program } from "@bolt-webgl/core";

import vertexShader from "./shaders/basic/basic.vert";
import fragmentShader from "./shaders/basic/basic.frag";

export default class Background extends DrawSet {
  initialProgram: Program;

  constructor({ map }) {
    const p = new Program(vertexShader, fragmentShader);

    p.activate();
    p.setTexture("map", map);

    const m = new Mesh({
      positions: [-1, -1, 0, -1, 4, 0, 4, -1, 0],
      indices: [2, 1, 0],
    });

    super(m, p);

    this.initialProgram = p;
  }
}
