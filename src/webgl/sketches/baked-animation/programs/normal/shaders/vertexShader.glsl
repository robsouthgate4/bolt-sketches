#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 normal;
uniform mat4 modelView;
uniform mat4 modelViewInverse;

uniform sampler2D	testTexture;

out vec2 Uv;

out vec3 Normal;

void main() {

	vec3 position 			= aPosition;

	// get the world space normal
	Normal						= vec3( model * vec4( aNormal, 0.0 ) );

	gl_Position				= projection * modelView * vec4( aPosition, 1.0 );

	Uv			= aUv;
}