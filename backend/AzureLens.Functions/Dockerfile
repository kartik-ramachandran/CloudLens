FROM mcr.microsoft.com/azure-functions/dotnet-isolated:4-dotnet-isolated8.0 AS base
WORKDIR /home/site/wwwroot
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["AzureLens.Functions/AzureLens.Functions.csproj", "AzureLens.Functions/"]
COPY ["AzureLens.API/AzureLens.API.csproj", "AzureLens.API/"]
RUN dotnet restore "AzureLens.Functions/AzureLens.Functions.csproj"
COPY . .
WORKDIR "/src/AzureLens.Functions"
RUN dotnet build "AzureLens.Functions.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "AzureLens.Functions.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /home/site/wwwroot
COPY --from=publish /app/publish .
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true
