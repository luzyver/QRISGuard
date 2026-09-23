FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /webhook .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /webhook /webhook
EXPOSE 3030
CMD ["/webhook"]
