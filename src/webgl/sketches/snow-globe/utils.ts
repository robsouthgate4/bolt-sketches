import { vec4 } from "gl-matrix";

export const getImageLightness = ( imageSrc, callback ) => {

	var img = document.createElement( "img" );
	img.src = imageSrc;
	img.style.display = "none";
	document.body.appendChild( img );

	img.onload = function () {

		// create canvas
		const canvas = document.createElement( "canvas" );
		canvas.width = img.width;
		canvas.height = img.height;

		const ctx = canvas.getContext( "2d" );
		ctx.drawImage( img, 0, 0 );

		const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );
		const data = imageData.data;


		const arr = [];
		const pixelBrightness = [];

		for ( var x = 0, len = data.length; x < len; x += 4 ) {

			var r = data[ x ];
			var g = data[ x + 1 ];
			var b = data[ x + 2 ];
			var a = data[ x + 3 ];

			const v = vec4.fromValues( r, g, b, a );

			arr.push( v );

		}

		// loop over array and get brightness
		for ( var i = 0; i < arr.length; i ++ ) {

			const v = arr[ i ];
			const brightness = ( 0.2126 * v[ 0 ] + 0.7152 * v[ 1 ] + 0.0722 * v[ 2 ] );

			pixelBrightness.push( brightness );

		}

		// get the min and max brightness using for loop
		let min = 0;
		let max = 0;

		for ( var i = 0; i < pixelBrightness.length; i ++ ) {

			if ( pixelBrightness[ i ] < min ) min = pixelBrightness[ i ];
			if ( pixelBrightness[ i ] > max ) max = pixelBrightness[ i ];

		}

		callback( arr, pixelBrightness, min, max );

	};

};
