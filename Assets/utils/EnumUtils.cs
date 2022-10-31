using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

public static class EnumUtils
{
    public static List<T> GetEnumList<T>()
    {
        T[] array = (T[])Enum.GetValues(typeof(T));
        List<T> list = new List<T>(array);
        return list;
    }
}
