import { mat4, vec3 } from "gl-matrix";
import VAO from "./VAO";
import VBO from "./VBO";
import IBO from "./IBO";
import Program from "./Program";
import VBOInstanced from "./VBOInstanced";

import Bolt from "./Bolt";
import { FLOAT, TRIANGLES, UNSIGNED_INT, UNSIGNED_SHORT } from "./Constants";
import Node from "./Node";
import { AttribPointer, BoxBounds, Face, GeometryBuffers, MeshParams, TypedArray } from "./Types";

export default class Mesh {

	private _gl: WebGL2RenderingContext;

	private _buffers: GeometryBuffers = {
		positions: undefined,
		normals: undefined,
		uvs: undefined,
		uvs2: undefined,
		indices: undefined,
	};

	// structured data
	private _faces: Face[] = [];
	private _vertices: number[][] = [];

	private _instanced?: boolean;
	private _vao: VAO;
	private _ibo!: IBO;
	private _instanceMatrices?: mat4[];
	private _instanceCount?: number;
	private _drawType: number;
	private _bounds: BoxBounds = { min: vec3.create(), max: vec3.create() };
	private _isSkinMesh = false;
	private _lineWidth?: number;

	constructor( geometry?: GeometryBuffers, params?: MeshParams ) {

		this._gl = Bolt.getInstance().getContext();

		this._drawType = TRIANGLES; // default draw mode

		if ( geometry ) {

			this._buffers.positions = geometry.positions;
			this._buffers.normals = geometry.normals;
			this._buffers.uvs = geometry.uvs;
			this._buffers.indices = geometry.indices;

		}

		this._instanced = params?.instanced;
		this._instanceMatrices = params?.instanceMatrices;
		this._instanceCount = params?.instanceCount;
		this._vao = new VAO();

		this._linkDefaultBuffers();

		if ( this._buffers.indices && this._buffers.indices.length > 0 ) {

			if ( this._instanced ) {

				// use higher precision for instanced meshes

				this._ibo = new IBO( new Uint32Array( this._buffers.indices ) );

			} else {

				this._ibo = new IBO( new Uint16Array( this._buffers.indices ) );

			}

		}

	}

	setDrawType( type: number ) {

		this._drawType = type;

		return this;

	}

	setLineWidth( width: number ) {

		this._lineWidth = width;

		return this;

	}

	setAttribute(
		buffer: TypedArray,
		size: number,
		layoutID: number | AttribPointer,
		type = FLOAT,
		offset = 0,
		divisor: number | undefined = undefined
	) {

		const vbo = new VBO( buffer );

		this._vao.bind();
		this._vao.linkAttrib(
			vbo,
			layoutID,
			size,
			type,
			size * buffer.BYTES_PER_ELEMENT,
			offset * buffer.BYTES_PER_ELEMENT,
			divisor
		);
		this._vao.unbind();

	}

	setVBO(
		vbo: VBO,
		size: number,
		layoutID: number | AttribPointer,
		type = FLOAT,
		offset = 0,
		divisor: number | undefined = undefined
	) {

		const buffer = vbo.buffer as TypedArray;

		this._vao.bind();
		this._vao.linkAttrib(
			vbo,
			layoutID,
			size,
			type,
			size * buffer.BYTES_PER_ELEMENT,
			offset * buffer.BYTES_PER_ELEMENT,
			divisor
		);

		this._vao.unbind();

	}


	/**
	 * store mesh faces from vertices and indices
	 */
	private _storeFaces() {

		if ( ! this._buffers.indices || ! this._buffers.positions ) return;

		let ia, ib, ic;
		let a, b, c;

		// construct vertex vectors
		for ( let i = 0; i < this._buffers.positions.length; i += 3 ) {

			this._vertices.push(
				[
					this._buffers.positions[ i + 0 ],
					this._buffers.positions[ i + 1 ],
					this._buffers.positions[ i + 2 ],

				]
			);

		}

		// generate face data
		for ( let i = 0; i < this._buffers.indices.length; i += 3 ) {

			ia = this._buffers.indices[ i ];
			ib = this._buffers.indices[ i + 1 ];
			ic = this._buffers.indices[ i + 2 ];

			a = this._vertices[ ia ];
			b = this._vertices[ ib ];
			c = this._vertices[ ic ];

			const face: Face = {
				indices: [ ia, ib, ic ],
				vertices: [ a, b, c ],
			};

			this._faces.push( face );

		}

	}

	private _linkDefaultBuffers() {

		const positionVbo = new VBO( new Float32Array( this._buffers.positions! ) );
		const normalVbo = new VBO( new Float32Array( this._buffers.normals! ) );
		const uvVbo = new VBO( new Float32Array( this._buffers.uvs! ) );

		this._vao.bind();

		this._vao.linkAttrib(
			positionVbo,
			0,
			3,
			FLOAT,
			3 * 4,
			0 * 4
		);

		if ( this._buffers.normals && this._buffers.normals.length > 0 ) {

			this._vao.linkAttrib(
				normalVbo,
				1,
				3,
				FLOAT,
				3 * 4,
				0 * 4
			);

		}

		if ( this._buffers.uvs && this._buffers.uvs.length > 0 ) {

			this._vao.linkAttrib(
				uvVbo,
				2,
				2,
				FLOAT,
				2 * 4,
				0 * 4
			);

		}

		if ( this._instanced && this._instanceMatrices ) {

			const instancedVBO = new VBOInstanced( this._instanceMatrices );
			instancedVBO.bind();

			const bytesMatrix = 4 * 16;
			const bytesVec4 = 4 * Float32Array.BYTES_PER_ELEMENT;

			this._vao.linkAttrib(
				instancedVBO,
				3,
				4,
				FLOAT,
				bytesMatrix,
				0 * bytesVec4
			);
			this._vao.linkAttrib(
				instancedVBO,
				4,
				4,
				FLOAT,
				bytesMatrix,
				1 * bytesVec4
			);
			this._vao.linkAttrib(
				instancedVBO,
				5,
				4,
				FLOAT,
				bytesMatrix,
				2 * bytesVec4
			);
			this._vao.linkAttrib(
				instancedVBO,
				6,
				4,
				FLOAT,
				bytesMatrix,
				3 * bytesVec4
			);

			this._gl.vertexAttribDivisor( 3, 1 );
			this._gl.vertexAttribDivisor( 4, 1 );
			this._gl.vertexAttribDivisor( 5, 1 );
			this._gl.vertexAttribDivisor( 6, 1 );

			instancedVBO.unbind();

		}

		this._vao.unbind();
		positionVbo.unbind();
		normalVbo.unbind();
		uvVbo.unbind();

		this._storeFaces();

	}

	calculateBoxBounds() {

		if ( ! this._buffers.positions || this.positions?.length === 0 ) {

			this._bounds = {
				min: vec3.create(),
				max: vec3.create()
			};

			return;

		}

		const min = vec3.create();
		const max = vec3.create();

		for ( let i = 0; i < this._buffers.positions.length / 3; i ++ ) {

			const v = vec3.fromValues( this._buffers.positions[ i * 3 + 0 ], this._buffers.positions[ i * 3 + 1 ], this._buffers.positions[ i * 3 + 2 ] );

			if ( v[ 0 ] < min[ 0 ] )
				min[ 0 ] = v[ 0 ];
			else if ( v[ 0 ] > max[ 0 ] )
				max[ 0 ] = v[ 0 ];
			if ( v[ 1 ] < min[ 1 ] )
				min[ 1 ] = v[ 1 ];
			else if ( v[ 1 ] > max[ 1 ] )
				max[ 1 ] = v[ 1 ];
			if ( v[ 2 ] < min[ 2 ] )
				min[ 2 ] = v[ 2 ];
			else if ( v[ 2 ] > max[ 2 ] )
				max[ 2 ] = v[ 2 ];

		}

		this._bounds = {
			min,
			max
		};

	}

	private _bindTextures( program: Program ) {

		if ( ! program ) return;

		if ( program.textures && program.textures.length > 0 ) {

			for ( let i = 0; i < program.textures.length; i ++ ) {

				const textureObject = program.textures[ i ];

				textureObject.texture.textureUnit( program, textureObject.uniformName, i );
				textureObject.texture.bind();

			}

		}

	}
	/**
	 * Delete vao and associated buffers
	 */
	delete() {

		// reset all buffer data
		this._buffers = {
			positions: [],
			normals: [],
			uvs: [],
			indices: []
		};

		this._faces = [];

		this._vao.delete();

	}

	/**
	 * Render bound mesh
	 * @param  {Program} program
	 */
	draw( program: Program, node?: Node ) {

		this._bindTextures( program );

		if ( this._lineWidth ) {

			this._gl.lineWidth( this._lineWidth );

		}

		this._vao.bind();

		if ( this._buffers.indices && this._buffers.indices.length > 0 ) {

			this._ibo.bind();

			if ( this._instanced && this._instanceCount ) {

				this._gl.drawElementsInstanced(
					this._drawType,
					this._ibo.count,
					UNSIGNED_INT,
					0,
					this._instanceCount
				);

			} else {

				this._gl.drawElements(
					this._drawType,
					this._buffers.indices.length,
					UNSIGNED_SHORT,
					0
				);

			}

			this._ibo.unbind();

		} else {

			if ( this._instanced && this._instanceCount ) {

				if ( ! this._buffers.positions ) return;

				this._gl.drawArraysInstanced(
					this._drawType,
					0,
					this._buffers.positions.length / 3,
					this._instanceCount
				);

			} else {

				if ( ! this._buffers.positions ) return;

				this._gl.drawArrays( this._drawType, 0, this._buffers.positions.length / 3 );

			}

		}

		this._vao.unbind();

	}

	public get drawType() {

		return this._drawType;

	}

	public set drawType( value ) {

		this._drawType = value;

	}

	public get bounds(): BoxBounds {

		return this._bounds;

	}
	public set bounds( value: BoxBounds ) {

		this._bounds = value;

	}

	public get indices(): number[] | Uint16Array | Int16Array | undefined {

		return this._buffers.indices;

	}

	public set indices_( value: number[] | Uint16Array | undefined ) {

		this._buffers.indices = value;

	}

	public get positions(): number[] | Float32Array | undefined {

		return this._buffers.positions;

	}

	public set positions( value: number[] | Float32Array | undefined ) {

		this._buffers.positions = value;

	}

	public get normals(): number[] | Float32Array | undefined {

		return this._buffers.normals;

	}

	public set normals( value: number[] | Float32Array | undefined ) {

		this._buffers.normals = value;

	}

	public get uvs(): number[] | Float32Array | undefined {

		return this._buffers.uvs;

	}

	public set uvs( value: number[] | Float32Array | undefined ) {

		this._buffers.uvs = value;

	}

	public get buffers(): GeometryBuffers {

		return this._buffers;

	}
	public set buffers( value: GeometryBuffers ) {

		this._buffers = value;

	}

	public get faces(): Face[] {

		return this._faces;

	}

	public get isSkinMesh() {

		return this._isSkinMesh;

	}
	public set isSkinMesh( value ) {

		this._isSkinMesh = value;

	}

	public get vao(): VAO {

		return this._vao;

	}
	public set vao( value: VAO ) {

		this._vao = value;

	}

}
