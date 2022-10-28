// PLYParser adapted from PlyReader.js (C) 2014 Matthias Pall Gissurarson
import { vec3, vec4 } from "gl-matrix";

export default class PLYParser {

	getNormal( p0: vec3, p1: vec3, p2: vec3 ) {

		var v1 = vec3.fromValues( p2[ 0 ] - p1[ 0 ],
			p2[ 1 ] - p1[ 1 ],
			p2[ 2 ] - p1[ 2 ] );
		var v2 = vec3.fromValues( p0[ 0 ] - p1[ 0 ],
			p0[ 1 ] - p1[ 1 ],
			p0[ 2 ] - p1[ 2 ] );
		var normal = vec3.fromValues( v1[ 1 ] * v2[ 2 ] - v2[ 1 ] * v1[ 2 ],
			v1[ 2 ] * v2[ 0 ] - v2[ 2 ] * v1[ 0 ],
			v1[ 0 ] * v2[ 1 ] - v2[ 0 ] * v1[ 1 ] );
		var normalLen = Math.sqrt( normal[ 0 ] * normal[ 0 ]
			+ normal[ 1 ] * normal[ 1 ]
			+ normal[ 2 ] * normal[ 2 ] );
		normal[ 0 ] /= normalLen;
		normal[ 1 ] /= normalLen;
		normal[ 2 ] /= normalLen;

		return normal;

	}

	getPoints( indices, vertices ) {

		var ps = [];
		for ( var i = 0; i < indices.length; i ++ ) {

			ps.push( vec3.fromValues( vertices[ indices[ i ] * 3 + 0 ],
				vertices[ indices[ i ] * 3 + 1 ],
				vertices[ indices[ i ] * 3 + 2 ] ) );

		}

		return ps;

	}

	parse( data, callback? ) {

		var retval, nl, line;
		var hasNormal = false;

		// Read header
		while ( data.length ) {

			nl = data.indexOf( "\n" ) + 1;
			line = data.substr( 0, nl - 1 ).trim();
			data = data.substr( nl );

			retval = line.match( /element (\w+) (\d+)/ );

			if ( retval ) {

				if ( retval[ 1 ] == "vertex" ) var npoints = parseInt( retval[ 2 ] );
				if ( retval[ 1 ] == "face" ) var npolys = parseInt( retval[ 2 ] );

			}

			if ( line == "property float nx" ) hasNormal = true;
			//We ignore all but points and normals, for now.
			if ( line == "end_header" ) break;

		}

		// Read points
		const minPoint = vec3.fromValues( Infinity, Infinity, Infinity );
		const maxPoint = vec3.fromValues( - Infinity, - Infinity, - Infinity );

		let vertices = [];

		const vertexNormals = [];
		const vNorms = [];

		for ( var i = 0; i < npoints; i ++ ) {

			nl = data.indexOf( "\n" ) + 1;
			line = data.substr( 0, nl - 1 ).trim();
			data = data.substr( nl );

			retval = line.split( " " );
			var point = vec3.fromValues( parseFloat( retval[ 0 ] ),
				parseFloat( retval[ 1 ] ),
				parseFloat( retval[ 2 ] ) );
			vertices.push( point[ 0 ], point[ 1 ], point[ 2 ] );

			if ( hasNormal ) vNorms.push( parseFloat( retval[ 3 ] ),
				parseFloat( retval[ 4 ] ),
				parseFloat( retval[ 5 ] ) );


			minPoint[ 0 ] = Math.min( minPoint[ 0 ], point[ 0 ] );
			minPoint[ 1 ] = Math.min( minPoint[ 1 ], point[ 1 ] );
			minPoint[ 2 ] = Math.min( minPoint[ 2 ], point[ 2 ] );
			maxPoint[ 0 ] = Math.max( maxPoint[ 0 ], point[ 0 ] );
			maxPoint[ 1 ] = Math.max( maxPoint[ 1 ], point[ 1 ] );
			maxPoint[ 2 ] = Math.max( maxPoint[ 2 ], point[ 2 ] );

		}

		// Polygons
		var pols = [];
		var newVertices = [];

		for ( var i = 0; i < npolys; i ++ ) {

			nl = data.indexOf( "\n" ) + 1;
			line = data.substr( 0, nl - 1 ).trim();
			data = data.substr( nl );

			retval = line.split( " " );
			var nvertex = parseInt( retval[ 0 ] );
			var indices = [];
			for ( var j = 0; j < nvertex; j ++ )
				indices.push( parseInt( retval[ j + 1 ] ) );

			// Polygon normal
			var ps = this.getPoints( indices, vertices );
			if ( ! hasNormal ) {

				var normal = this.getNormal( ps[ 0 ], ps[ 1 ], ps[ 2 ] );
				var ns = [ normal, normal, normal ];

			} else {

				const ns = this.getPoints( indices, vNorms );

			}

			pols.push( indices );

			for ( var j = 0; j < 3; j ++ ) {

				newVertices.push( ps[ j ][ 0 ], ps[ j ][ 1 ], ps[ j ][ 2 ] );
				vertexNormals.push( ns[ j ][ 0 ], ns[ j ][ 1 ], ns[ j ][ 2 ] );

			}

			//If faces are declared as boxes,
			//not triangles.
			if ( nvertex == 4 ) {

				ps.splice( 1, 1 );
				if ( ! hasNormal ) {

					var normal = this.getNormal( ps[ 0 ], ps[ 1 ], ps[ 2 ] );
					var ns = [ normal, normal, normal, normal ];

				}

				ns.splice( 1, 1 );
				for ( var j = 0; j < 3; j ++ ) {

					newVertices.push( ps[ j ][ 0 ], ps[ j ][ 1 ], ps[ j ][ 2 ] );
					vertexNormals.push( ns[ j ][ 0 ], ns[ j ][ 1 ], ns[ j ][ 2 ] );

				}

			}

		}

		//vertices = newVertices;

		// Move to center of object
		const centerMove = vec3.fromValues( - ( maxPoint[ 0 ] + minPoint[ 0 ] ) / 2,
			- ( maxPoint[ 1 ] + minPoint[ 1 ] ) / 2,
			- ( maxPoint[ 2 ] + minPoint[ 2 ] ) / 2 );

		const scaleY = ( maxPoint[ 1 ] - minPoint[ 1 ] ) / 2;
		const points = [];
		const normals = [];

		for ( var i = 0; i < vertices.length; i += 3 ) {

			vertices[ i + 0 ] += centerMove[ 0 ];
			vertices[ i + 1 ] += centerMove[ 1 ];
			vertices[ i + 2 ] += centerMove[ 2 ];

			vertices[ i + 0 ] /= scaleY;
			vertices[ i + 1 ] /= scaleY;
			vertices[ i + 2 ] /= scaleY;

			points.push( vertices[ i ],
				vertices[ i + 1 ],
				vertices[ i + 2 ] );

			normals.push( vertexNormals[ i ],
				vertexNormals[ i + 1 ],
				vertexNormals[ i + 2 ] );

		}

		return { "points": points, "normals": normals, "polys": pols };

	}

}
