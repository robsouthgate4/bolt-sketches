#version 300 es

precision highp float;

uniform sampler2D map;
uniform sampler2D mapDepth;

uniform float featherA;
uniform float featherB;

in vec2 Uv;
in vec3 Normal;
in vec3 ViewVector;
in vec3 Pos;

out vec4 FragColor;


void main() {

    vec3 color = texture( map, Uv ).rgb;

	float depth = texture( mapDepth, Uv ).r;

	float d = smoothstep( featherA, featherB, 1.0 - depth );

	//color.b += 0.2;
	//color.g += 0.1;

	if( Pos.z < 0.15 ) {

		if( color.r < 0.2 ) discard;

	}

	if( Pos.y < -0.35 ) discard;

	FragColor = vec4( color, smoothstep( featherA, featherB, depth ) );

}