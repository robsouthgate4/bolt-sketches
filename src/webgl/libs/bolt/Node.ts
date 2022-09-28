import Camera from "./Camera";
import Program from "./Program";
import { mat4, vec3 } from "gl-matrix";
import Transform from "./Transform";

/**
 * Node class
 * Holds scene graph data
 * Contains object transforms
*/
export default class Node {

	private _localMatrix: mat4;
	private _modelMatrix: mat4;
	private _autoUpdate: boolean;
	private _children!: Node[];
	private _parent!: Node | null;
	private _name: string;
	private _transform!: Transform;
	private _normalMatrix: mat4;
	private _modelViewMatrix: mat4;
	private _draw: boolean;
	private _cameraDepth!: number;

	constructor() {

		this._localMatrix = mat4.create();
		this._modelMatrix = mat4.create();
		this._modelViewMatrix = mat4.create();
		this._normalMatrix = mat4.create();
		this._children = [];
		this._parent = null;
		this._transform = new Transform();
		this._name = "";
		this._autoUpdate = true;
		this._draw = true;

	}

	/**
	 * Attaches this node to a parent node
	 * @param  {Node} parent
	 */
	setParent( parent: Node ) {

		if ( this._parent ) {

			const index = this._parent._children.indexOf( this );

			if ( index >= 0 ) {

				this._parent._children.slice( index, 1 );

			}

		}

		if ( parent ) {

			parent._children.push( this );

		}

		this._parent = parent;

	}

	/**
	 * Loops over all child nodes and executes a call back function
	 * @param  {Function} fn
	 */
	traverse( fn: Function ) {

		fn( this );
		for ( const child of this._children ) {

			child.traverse( fn );

		}

	}
	/**
	 * Updates this node's model matrix relative to the current node chain
	 * @param  {mat4} parentModelMatrix?
	 */
	updateModelMatrix( parentModelMatrix?: mat4 ) {

		if ( ! this._autoUpdate ) return;

		const transform = this._transform;

		if ( transform && transform.needsUpdate ) {

			this._localMatrix = transform.updateLocalTransformMatrix();

		}

		if ( parentModelMatrix ) {

			mat4.multiply( this._modelMatrix, parentModelMatrix, this._localMatrix );

		} else {

			mat4.copy( this._modelMatrix, this._localMatrix );

		}

		const modelMatrix = this._modelMatrix;

		// Process child objects

		this._children.forEach( ( child ) => child.updateModelMatrix( modelMatrix ) );

	}
	/**
	 * Adds child to current node to chain
	 * @param  {Node} child
	 */
	addChild( child: Node ) {

		this._children.push( child );

	}
	/**
	 * Removes child node from current node chain
	 * @param  {Node} child
	 */
	removeChild( child: Node ) {

		const ndx = this._children.indexOf( child );
		this._children.splice( ndx, 1 );

	}

	/**
	 * Updates each node's model matrix
	 * Set's projection, view and model matrix uniforms of given program
	 * @param  {Program} program
	 * @param  {Camera} camera
	 */
	updateMatrices( program: Program, camera: Camera ) {

		program.activate();
		program.setMatrix4( "projection", camera.projection );
		program.setMatrix4( "view", camera.view );
		program.setMatrix4( "model", this._modelMatrix );

		// Generate normal matrix
		mat4.multiply( this._modelViewMatrix, this._modelMatrix, camera.view );
		mat4.invert( this._normalMatrix, this._modelViewMatrix );
		mat4.transpose( this._normalMatrix, this._normalMatrix );

		program.setMatrix4( "normal", this._normalMatrix );

		this.updateModelMatrix();

	}
	/**
	 * Returns the world matrix relative to this nodes parent
	 * @returns mat4
	 */
	public get worldMatrix(): mat4 {

		const worldMatrix = mat4.create();

		if ( this.parent ) {

			mat4.multiply( worldMatrix, this._localMatrix, this.parent.modelMatrix );

		} else {

			mat4.copy( worldMatrix, this._localMatrix );

		}

		return worldMatrix;

	}
	/**
	 * Returns the world position of this node
	 * @returns vec3
	 */
	public get worldPosition(): vec3 {

		const position = vec3.create();

		mat4.getTranslation( position, this.worldMatrix );

		return position;

	}

	public get modelMatrix(): mat4 {

		return this._modelMatrix;

	}

	public set modelMatrix( value: mat4 ) {

		this._modelMatrix = value;

	}

	public get localMatrix(): mat4 {

		return this._localMatrix;

	}

	public set localMatrix( value: mat4 ) {

		this._localMatrix = value;

	}

	public get children(): Node[] {

		return this._children;

	}

	public set children( value: Node[] ) {

		this._children = value;

	}

	public get parent(): Node | null {

		return this._parent;

	}

	public set parent( value: Node | null ) {

		this._parent = value;

	}

	public get transform(): Transform {

		return this._transform;

	}

	public set transform( value: Transform ) {

		this._transform = value;

	}

	public get name(): string {

		return this._name;

	}

	public set name( value: string ) {

		this._name = value;

	}

	public get draw(): boolean {

		return this._draw;

	}

	public set draw( value: boolean ) {

		this._draw = value;

	}

	public get autoUpdate(): boolean {

		return this._autoUpdate;

	}

	public set autoUpdate( value: boolean ) {

		this._autoUpdate = value;

	}

	public get cameraDepth(): number {

		return this._cameraDepth;

	}
	public set cameraDepth( value: number ) {

		this._cameraDepth = value;

	}

}
