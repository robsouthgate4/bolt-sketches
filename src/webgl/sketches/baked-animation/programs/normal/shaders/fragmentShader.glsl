#version 300 es

precision highp float;
in vec3		Normal;
in vec2 Uv;

out vec4 FragColor;

void main() {

	// output the fragment color
	FragColor		= vec4( Normal, 1.0 );

}




