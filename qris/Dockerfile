FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /qris .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /qris /qris
EXPOSE 8888
CMD ["/qris"]
