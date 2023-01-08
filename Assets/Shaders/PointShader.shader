// Upgrade NOTE: replaced 'mul(UNITY_MATRIX_MVP,*)' with 'UnityObjectToClipPos(*)'

Shader "X-Zest/PointShader"
{
	Properties
	{
		_Color ("Color", Color) = (1, 1, 1, 1)
	}

	SubShader
	{
		LOD 200

		Pass
		{
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag

            StructuredBuffer<float2> points;
			uniform float4 _Color;


			struct VertexInput
			{
				float4 position : POSITION;
			};

			struct VertexOutput
			{
				float4 position : SV_POSITION;
				float4 color : COLOR;
				float size : PSIZE;
			};

			VertexOutput vert(uint id : SV_VertexID) {
				VertexOutput o;
				o.position = UnityObjectToClipPos(float4(points[id], 0.0f, 1.0f));
				o.color = _Color;
				o.size = 1;
				return o;
			}

			float4 frag(VertexOutput o) : COLOR{
				return o.color;
			}

			ENDCG
		}
	}
}
