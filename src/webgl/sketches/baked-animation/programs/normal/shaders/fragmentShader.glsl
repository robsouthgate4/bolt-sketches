#version 300 es

precision highp float;

uniform sampler2D	testTexture;
uniform sampler2D	testTexture2;

in vec3		Normal;
in vec2 Uv;

out vec4 FragColor;

void main() {

	// output the fragment color
	FragColor		= vec4( mix( texture( testTexture, Uv ).rgb, texture( testTexture2, Uv ).rgb, step( 0.5, Uv.y ) ), 1.0);

}




