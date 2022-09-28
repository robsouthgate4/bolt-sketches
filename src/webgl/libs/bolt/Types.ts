import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";
import Program from "./Program";
import Texture from "./Texture";
import TextureCube from "./TextureCube";


export interface BoltParams {
	antialias?: boolean;
	dpi?: number;
	powerPreference?: "high-performance" | "low-power" | "default";
	alpha?: boolean;
	premultipliedAlpha?: boolean;
}

export interface Viewport { offsetX: number; offsetY: number; width: number; height: number; }

export type TypedArray =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array;

export type UniformType = number | vec2 | vec3 | vec4 | mat2 | mat3 | mat4 | Texture | TextureCube;

export interface AttribPointer {
	attributeName: string;
	program: Program;
}

export interface GeometryBuffers {
	positions?: number[] | Float32Array;
	normals?: number[] | Float32Array;
	uvs?: number[] | Float32Array;
	uvs2?: number[] | Float32Array;
	indices?: number[] | Uint16Array | Int16Array;
}

export interface MeshParams {
	indices?: number[];
	drawType?: number;
	instanced?: boolean;
	instanceCount?: number;
	instanceMatrices?: mat4[];
}

export interface Face {
	indices: number[],
	vertices: number[][]
}

export interface BoxBounds {
	min: vec3;
	max: vec3;
}
export interface TextureObject {
	uniformName: string;
	texture: Texture | TextureCube;
}

export interface Uniform {
	value: UniformType
}

export interface UniformObject {
	[key: string]: Uniform
}

export interface BlendOptions {
	src: number;
	dst: number;
}
