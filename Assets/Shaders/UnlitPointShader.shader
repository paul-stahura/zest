Shader "X-Zest/UnlitPointShader"
{
	Properties
	{
		_Color ("Color", Color) = (1, 1, 1, 1)
	}
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
            };

            // Properties backing variables
			uniform float4 _Color;

            struct v2f
            {
                float4 color : COLOR;
                float4 vertex : SV_POSITION;
                float size : PSIZE;
            };

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.color = _Color;
                o.size = 2;
                UNITY_TRANSFER_FOG(o,o.vertex);
                return o;
            }

            float4 frag (v2f i) : SV_Target
            {
                return i.color;
            }
            ENDCG
        }
    }
}
