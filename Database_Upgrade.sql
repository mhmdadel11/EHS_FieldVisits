/* EHS Field Visits - SQL Server schema upgrade
   Run this against database [EHS_FieldVisits] if you want to upgrade manually.
   The application also runs the same safety checks automatically at startup.
*/
USE [EHS_FieldVisits];
GO

IF OBJECT_ID(N'[Visits]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('Visits','Facility') IS NULL ALTER TABLE [Visits] ADD [Facility] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Facility] DEFAULT N'';
    IF COL_LENGTH('Visits','Emirate') IS NULL ALTER TABLE [Visits] ADD [Emirate] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Emirate] DEFAULT N'';
    IF COL_LENGTH('Visits','Date') IS NULL ALTER TABLE [Visits] ADD [Date] DATETIME2 NOT NULL CONSTRAINT [DF_Visits_Date] DEFAULT GETDATE();
    IF COL_LENGTH('Visits','Team') IS NULL ALTER TABLE [Visits] ADD [Team] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Team] DEFAULT N'';
    IF COL_LENGTH('Visits','Responsible') IS NULL ALTER TABLE [Visits] ADD [Responsible] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Responsible] DEFAULT N'';
    IF COL_LENGTH('Visits','JobTitle') IS NULL ALTER TABLE [Visits] ADD [JobTitle] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_JobTitle] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeName') IS NULL ALTER TABLE [Visits] ADD [EmployeeName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeName] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeJobTitle') IS NULL ALTER TABLE [Visits] ADD [EmployeeJobTitle] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeJobTitle] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeEmail') IS NULL ALTER TABLE [Visits] ADD [EmployeeEmail] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeEmail] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeePhone') IS NULL ALTER TABLE [Visits] ADD [EmployeePhone] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeePhone] DEFAULT N'';
    IF COL_LENGTH('Visits','ResponsibleEmail') IS NULL ALTER TABLE [Visits] ADD [ResponsibleEmail] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_ResponsibleEmail] DEFAULT N'';
    IF COL_LENGTH('Visits','ResponsiblePhone') IS NULL ALTER TABLE [Visits] ADD [ResponsiblePhone] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_ResponsiblePhone] DEFAULT N'';
    IF COL_LENGTH('Visits','Category') IS NULL ALTER TABLE [Visits] ADD [Category] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Category] DEFAULT N'';
    IF COL_LENGTH('Visits','Priority') IS NULL ALTER TABLE [Visits] ADD [Priority] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Priority] DEFAULT N'';
    IF COL_LENGTH('Visits','Status') IS NULL ALTER TABLE [Visits] ADD [Status] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Status] DEFAULT N'';
    IF COL_LENGTH('Visits','Compliance') IS NULL ALTER TABLE [Visits] ADD [Compliance] INT NOT NULL CONSTRAINT [DF_Visits_Compliance] DEFAULT 0;
    IF COL_LENGTH('Visits','Notes') IS NULL ALTER TABLE [Visits] ADD [Notes] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Notes] DEFAULT N'';
    IF COL_LENGTH('Visits','Action') IS NULL ALTER TABLE [Visits] ADD [Action] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Action] DEFAULT N'';
    IF COL_LENGTH('Visits','TakenAction') IS NULL ALTER TABLE [Visits] ADD [TakenAction] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_TakenAction] DEFAULT N'';
    IF COL_LENGTH('Visits','ActionEvidencePath') IS NULL ALTER TABLE [Visits] ADD [ActionEvidencePath] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Visits','OwnerId') IS NULL ALTER TABLE [Visits] ADD [OwnerId] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerId] DEFAULT N'';
    IF COL_LENGTH('Visits','OwnerName') IS NULL ALTER TABLE [Visits] ADD [OwnerName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerName] DEFAULT N'';
    IF COL_LENGTH('Visits','OwnerUsername') IS NULL ALTER TABLE [Visits] ADD [OwnerUsername] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerUsername] DEFAULT N'';
    IF COL_LENGTH('Visits','CreatedAt') IS NULL ALTER TABLE [Visits] ADD [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Visits_CreatedAt] DEFAULT SYSUTCDATETIME();
END
GO

IF OBJECT_ID(N'[VisitImages]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('VisitImages','VisitId') IS NULL ALTER TABLE [VisitImages] ADD [VisitId] INT NOT NULL CONSTRAINT [DF_VisitImages_VisitId] DEFAULT 0;
    IF COL_LENGTH('VisitImages','FileName') IS NULL ALTER TABLE [VisitImages] ADD [FileName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_VisitImages_FileName] DEFAULT N'';
    IF COL_LENGTH('VisitImages','FilePath') IS NULL ALTER TABLE [VisitImages] ADD [FilePath] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_VisitImages_FilePath] DEFAULT N'';
    IF COL_LENGTH('VisitImages','ContentType') IS NULL ALTER TABLE [VisitImages] ADD [ContentType] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_VisitImages_ContentType] DEFAULT N'application/octet-stream';
END
GO
