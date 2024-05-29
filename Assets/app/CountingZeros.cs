using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class CountingZeros : MonoBehaviour
{
    Dictionary<int, double> _zeroTable = new Dictionary<int, double>();
    [SerializeField] private int _countTo = 100;
    [SerializeField] private bool _countPointsButton = false;

    
    void Update()
    {
        if(_countPointsButton)
        {
            CountZeros(_countTo);
            _countPointsButton = false;
        }
    }

    public void CountZeros(int maxIndex)
    {
        double[] zetaZeros = ZetaZeros.Get();

        int[] zeros = new int[maxIndex];
        int zeroIndex = 0;

        double imaginary(int n) => 2 * Math.PI * (n * 2 + 1) / (Math.Log(n + 1) - Math.Log(n));

        for (int i = 1; i <= maxIndex; i++)
        {
            double indexBound = imaginary(i);
            
            // Debug.Log(indexBound);
            zeros[i - 1] = 0;
            
            while(zetaZeros[zeroIndex] <= indexBound)
            {
                // Debug.Log("zero: " + _zeroTable[zeroIndex]);
                zeros[i - 1] += 1;
                zeroIndex += 1;
            }
            // Debug.Log(i + ", " + zeros[i - 1]);
        }

        WriteZeroPointTable(zeros);
    }

    private void WriteZeroPointTable(int[] zeros)
    {
        // write table
        string fileName = "ZeroPoints.csv";

        // Combine the path to the "Resources" folder with the file name
        string filePath = Path.Combine(Application.dataPath + "/StreamingAssets", fileName);

        // Create or overwrite the file
        using (StreamWriter writer = new StreamWriter(filePath, false))
        {
            // header
            writer.WriteLine($"Index, Zeros");

            // points
            for(int i = 0; i < zeros.Length; i++)
            {
                writer.WriteLine($"{i + 1}, {zeros[i]}");
            }
        }
    }
}
