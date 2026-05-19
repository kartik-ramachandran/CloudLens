FROM mcr.microsoft.com/azure-functions/dotnet-isolated:4-dotnet-isolated8.0 AS base
WORKDIR /home/site/wwwroot
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["CloudLens.Functions/CloudLens.Functions.csproj", "CloudLens.Functions/"]
COPY ["CloudLens.API/CloudLens.API.csproj", "CloudLens.API/"]
RUN dotnet restore "CloudLens.Functions/CloudLens.Functions.csproj"
COPY . .
WORKDIR "/src/CloudLens.Functions"
RUN dotnet build "CloudLens.Functions.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CloudLens.Functions.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /home/site/wwwroot
COPY --from=publish /app/publish .
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true
