EHS Field Visits - Build Fix V27

This package is intentionally flattened so the .sln and .csproj are in the same project root.
Visual Studio build artifacts (.vs/bin/obj) were removed.
A Directory.Build.targets file creates the StaticWebAssets intermediate directory before the ASP.NET Core SDK writes its props file.

Steps:
1. Extract the ZIP to a normal local folder, e.g. C:\EHS_FieldVisits_V27
2. Open EHS_FieldVisits_SQLServer.sln in Visual Studio 2022.
3. Close Visual Studio once after opening if it was previously open with the old copy.
4. Build > Clean Solution.
5. Build > Rebuild Solution.
6. Run the project.

Do NOT copy the old .vs, bin, or obj folders from an older version into this package.
