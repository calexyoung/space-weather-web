-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('NOAA_SWPC', 'UK_MET_OFFICE', 'HELIO_UCLES', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HazardLevel" AS ENUM ('G1', 'G2', 'G3', 'G4', 'G5', 'R1', 'R2', 'R3', 'R4', 'R5', 'S1', 'S2', 'S3', 'S4', 'S5');

-- CreateEnum
CREATE TYPE "public"."LlmProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ExportFormat" AS ENUM ('MARKDOWN', 'HTML', 'JSON', 'PDF');

-- CreateTable
CREATE TABLE "public"."space_weather_reports" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "combinedHeadline" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "outlookNext72h" TEXT NOT NULL,
    "markdownContent" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "jsonMetadata" JSONB,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "searchVector" TEXT,
    "wordCount" INTEGER,
    "readingTime" INTEGER,
    "llmProvider" "public"."LlmProvider",
    "llmModel" TEXT,
    "generationTime" INTEGER,
    "temperature" DOUBLE PRECISION,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "lastDownloadedAt" TIMESTAMP(3),
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_weather_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_exports" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" "public"."ExportFormat" NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "downloadUrl" TEXT,
    "requestedBy" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."normalized_reports" (
    "id" TEXT NOT NULL,
    "source" "public"."SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "confidence" TEXT,
    "validStart" TIMESTAMP(3),
    "validEnd" TIMESTAMP(3),
    "geomagneticLevel" "public"."HazardLevel",
    "geomagneticText" TEXT,
    "radioBlackoutLevel" "public"."HazardLevel",
    "radioBlackoutText" TEXT,
    "radiationStormLevel" "public"."HazardLevel",
    "radiationStormText" TEXT,
    "rawPayload" JSONB,
    "processingErrors" TEXT[],
    "qualityScore" DOUBLE PRECISION,
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalized_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."space_weather_data" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "dataType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "source" TEXT,
    "quality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "markdownTemplate" TEXT NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "variablesSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_conversations" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "provider" "public"."LlmProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fetch_logs" (
    "id" TEXT NOT NULL,
    "source" "public"."SourceType" NOT NULL,
    "url" TEXT,
    "success" BOOLEAN NOT NULL,
    "responseTime" INTEGER,
    "errorMessage" TEXT,
    "httpStatus" INTEGER,
    "dataPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "space_weather_reports_status_isDeleted_idx" ON "public"."space_weather_reports"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "space_weather_reports_generatedAt_idx" ON "public"."space_weather_reports"("generatedAt");

-- CreateIndex
CREATE INDEX "space_weather_reports_parentId_idx" ON "public"."space_weather_reports"("parentId");

-- CreateIndex
CREATE INDEX "space_weather_reports_searchVector_idx" ON "public"."space_weather_reports"("searchVector");

-- CreateIndex
CREATE INDEX "space_weather_reports_llmProvider_idx" ON "public"."space_weather_reports"("llmProvider");

-- CreateIndex
CREATE INDEX "space_weather_reports_combinedHeadline_idx" ON "public"."space_weather_reports"("combinedHeadline");

-- CreateIndex
CREATE INDEX "space_weather_reports_executiveSummary_idx" ON "public"."space_weather_reports"("executiveSummary");

-- CreateIndex
CREATE INDEX "space_weather_reports_outlookNext72h_idx" ON "public"."space_weather_reports"("outlookNext72h");

-- CreateIndex
CREATE INDEX "report_exports_reportId_idx" ON "public"."report_exports"("reportId");

-- CreateIndex
CREATE INDEX "report_exports_format_idx" ON "public"."report_exports"("format");

-- CreateIndex
CREATE INDEX "report_exports_createdAt_idx" ON "public"."report_exports"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "public"."system_config"("key");

-- AddForeignKey
ALTER TABLE "public"."space_weather_reports" ADD CONSTRAINT "space_weather_reports_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."space_weather_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."space_weather_reports" ADD CONSTRAINT "space_weather_reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_exports" ADD CONSTRAINT "report_exports_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."space_weather_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."normalized_reports" ADD CONSTRAINT "normalized_reports_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."space_weather_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
