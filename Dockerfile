FROM node:16-alpine3.14
RUN apk add -U --no-cache curl python3 build-base pkgconf libusb-dev libusb alpine-sdk linux-headers libudev-zero-dev libudev-zero bash ruby-bundler ruby-dev
RUN gem install unf_ext -v '0.0.8.2' --source 'https://rubygems.org/'
WORKDIR /opt
RUN curl -L https://unpkg.com/@pnpm/self-installer | node
WORKDIR /usr/src/app
