import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";
import Texture from "./Texture";
import Bolt from "./Bolt";
import { FRAGMENT_SHADER, LINK_STATUS, ONE, ONE_MINUS_SRC_ALPHA, VERTEX_SHADER } from "./Constants";
import TextureCube from "./TextureCube";
import { BlendOptions, TextureObject, UniformObject } from "./Types";
export default class Program {

	private _gl: WebGL2RenderingContext;
	private _vertexShader: WebGLShader;
	private _fragmentShader: WebGLShader;
	private _program: WebGLProgram;
	private _textures: TextureObject[];
	private _uniforms: UniformObject;
	private _vertexShaderSource!: string;
	private _fragmentShaderSource!: string;
	private _name!: string;
	private _transparent = false;
	private _blendFunction: BlendOptions = { src: ONE, dst: ONE_MINUS_SRC_ALPHA };
	private _cullFace?: number | undefined = undefined;

	constructor(
		vertexShaderSrc: string,
		fragmentShaderSrc: string,
		parameters?: {
			transformFeedbackVaryings: string[];
		}
	) {

		this._vertexShaderSource = vertexShaderSrc;
		this._fragmentShaderSource = fragmentShaderSrc;

		this._textures = <TextureObject[]>[];

		this._uniforms = {};

		this._gl = Bolt.getInstance().getContext();

		this._vertexShader = <WebGLShader>(
			this._gl.createShader( VERTEX_SHADER )
		);

		this._gl.shaderSource( this._vertexShader, vertexShaderSrc );
		this._gl.compileShader( this._vertexShader );
		const vertexLogs = this._gl.getShaderInfoLog( this._vertexShader );

		if ( vertexLogs && vertexLogs.length > 0 ) {

			throw vertexLogs;

		}

		this._fragmentShader = <WebGLShader>(
			this._gl.createShader( FRAGMENT_SHADER )
		);

		this._gl.shaderSource( this._fragmentShader, fragmentShaderSrc );
		this._gl.compileShader( this._fragmentShader );

		const fragmentLogs = this._gl.getShaderInfoLog( this._fragmentShader );

		if ( fragmentLogs && fragmentLogs.length > 0 ) {

			throw fragmentLogs;

		}

		this._program = <WebGLProgram> this._gl.createProgram();

		this._gl.attachShader( this._program, this._vertexShader );
		this._gl.attachShader( this._program, this._fragmentShader );

		if ( parameters?.transformFeedbackVaryings ) {

			this._gl.transformFeedbackVaryings(
				this._program,
				parameters.transformFeedbackVaryings,
				this._gl.SEPARATE_ATTRIBS
			);

		}

		this._gl.linkProgram( this._program );

		if ( ! this._gl.getProgramParameter( this._program, LINK_STATUS ) ) {

			const info = this._gl.getProgramInfoLog( this._program );
			throw "Could not compile WebGL program. \n\n" + info;

		}

		this._gl.deleteShader( this._vertexShader );
		this._gl.deleteShader( this._fragmentShader );

	}

	setBool( uniform: string, value: number ) {

		this._gl.uniform1i(
			this._gl.getUniformLocation( this._program, uniform ),
			+ value
		);

		this._uniforms[ uniform ] = { value };

	}

	setInt( uniform: string, value: number ) {

		this._gl.uniform1i( this._gl.getUniformLocation( this._program, uniform ), value );

		this._uniforms[ uniform ] = { value };

	}

	setFloat( uniform: string, value: number ) {

		this._gl.uniform1f( this._gl.getUniformLocation( this._program, uniform ), value );

		this._uniforms[ uniform ] = { value };

	}

	setVector2( uniform: string, value: vec2 ) {

		this._gl.uniform2fv(
			this._gl.getUniformLocation( this._program, uniform ),
			value
		);

		this._uniforms[ uniform ] = { value };

	}

	setVector3( uniform: string, value: vec3 ) {

		this._gl.uniform3fv(
			this._gl.getUniformLocation( this._program, uniform ),
			value
		);

		this._uniforms[ uniform ] = { value };

	}

	setVector4( uniform: string, value: vec4 ) {

		this._gl.uniform4fv(
			this._gl.getUniformLocation( this._program, uniform ),
			value

		);

		this._uniforms[ uniform ] = { value };


	}

	setMatrix2( uniform: string, value: mat2 ) {

		this._gl.uniformMatrix2fv(
			this._gl.getUniformLocation( this._program, uniform ),
			false,
			value
		);

		this._uniforms[ uniform ] = { value };


	}

	setMatrix3( uniform: string, value: mat3 ) {

		this._gl.uniformMatrix3fv(
			this._gl.getUniformLocation( this._program, uniform ),
			false,
			value
		);

		this._uniforms[ uniform ] = { value };


	}

	setMatrix4( uniform: string, value: mat4 ) {

		this._gl.uniformMatrix4fv(
			this._gl.getUniformLocation( this._program, uniform ),
			false,
			value
		);

		this._uniforms[ uniform ] = { value };


	}

	setTexture( uniform: string, texture: Texture | TextureCube ) {

		const exists = this._textures.findIndex(
			( texture ) => texture.uniformName === uniform
		);

		if ( exists != - 1 ) {

			this._textures[ exists ] = {
				uniformName: uniform,
				texture,
			};

		} else {

			this._textures.push( {
				uniformName: uniform,
				texture,
			} );

		}

		this._uniforms[ uniform ] = { value: texture };


	}

	activate() {

		this._gl.useProgram( this._program );

	}

	delete() {

		this._gl.deleteProgram( this._program );

	}

	public get name(): string {

		return this._name;

	}
	public set name( value: string ) {

		this._name = value;

	}

	public get vertexShader(): WebGLShader {

		return this._vertexShader;

	}
	public set vertexShader( value: WebGLShader ) {

		this._vertexShader = value;

	}
	public get fragmentShader(): WebGLShader {

		return this._fragmentShader;

	}
	public set fragmentShader( value: WebGLShader ) {

		this._fragmentShader = value;

	}
	public get program(): WebGLProgram {

		return this._program;

	}
	public get textures(): TextureObject[] {

		return this._textures;

	}
	public set textures( value: TextureObject[] ) {

		this._textures = value;

	}

	public get uniforms(): UniformObject {

		return this._uniforms;

	}

	public set uniforms( value: UniformObject ) {

		this._uniforms = value;

	}

	public get vertexShaderSource(): string {

		return this._vertexShaderSource;

	}

	public set vertexShaderSource( value: string ) {

		this._vertexShaderSource = value;

	}

	public get fragmentShaderSource(): string {

		return this._fragmentShaderSource;

	}

	public set fragmentShaderSource( value: string ) {

		this._fragmentShaderSource = value;

	}

	public get transparent() {

		return this._transparent;

	}

	public set transparent( value ) {

		this._transparent = value;

	}

	public get blendFunction() {

		return this._blendFunction;

	}

	public set blendFunction( value ) {

		this._blendFunction = value;

	}

	public get cullFace(): number {

		return this._cullFace!;

	}
	public set cullFace( value: number ) {

		this._cullFace = value;

	}



}
