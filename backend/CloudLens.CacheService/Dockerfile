# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["CloudLens.CacheService/CloudLens.CacheService.csproj", "CloudLens.CacheService/"]
COPY ["CloudLens.API/CloudLens.API.csproj", "CloudLens.API/"]
RUN dotnet restore "CloudLens.CacheService/CloudLens.CacheService.csproj"

# Copy source and build
COPY ["CloudLens.CacheService/", "CloudLens.CacheService/"]
COPY ["CloudLens.API/", "CloudLens.API/"]
RUN dotnet build "CloudLens.CacheService/CloudLens.CacheService.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "CloudLens.CacheService/CloudLens.CacheService.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 8081

RUN mkdir -p /app/data

ENV ASPNETCORE_URLS=http://+:8081
ENTRYPOINT ["dotnet", "CloudLens.CacheService.dll"]
