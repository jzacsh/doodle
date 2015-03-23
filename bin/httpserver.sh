#!/usr/bin/env bash
#
# For app name "$1", run nginx static file server of "$3" contents, on port "$2"

appName="$1"
appPort="$2"
staticFiles="$(readlink -f "${3:-$(pwd)}")"

(( $# < 2 )) && {
  printf 'usage: APP_NAME PORT [STATIC_FILES_DIR] \n' >&2
  exit 1
}

if ! type nginx > /dev/null; then
  python -m SimpleHTTPServer "$appPort"
  exit "$?"
fi

nginxTmpDir="$(mktemp --directory -t "nginx-local_${appName}.XXXXXXX")"
nginxConfig="$nginxTmpDir/conf"
cat > "$nginxTmpDir/conf" <<END_OF_CUSTOM_NGINX_CONF
pid $nginxTmpDir/nginx.pid;
error_log $nginxTmpDir/nginx.error.log;

worker_processes  1;

events {
    worker_connections  1024;
}

http {
    access_log $nginxTmpDir/nginx.access.log;

    # protips per http://www.acunetix.com/blog/articles/nginx-server-security-hardening-configuration-1/
    server_tokens off;
    client_body_buffer_size 1k;
    client_header_buffer_size 1k;
    client_max_body_size 1k;
    large_client_header_buffers 2 1k;
    add_header X-Frame-Options "SAMEORIGIN";
    # end protips

    # per https://www.exratione.com/2014/03/running-nginx-as-a-non-root-user/
    client_body_temp_path $nginxTmpDir/client_body;
    fastcgi_temp_path $nginxTmpDir/fastcgi_temp;
    proxy_temp_path $nginxTmpDir/proxy_temp;
    scgi_temp_path $nginxTmpDir/scgi_temp;
    uwsgi_temp_path $nginxTmpDir/uwsgi_temp;

    include       /usr/local/nginx/conf/mime.types;
    default_type  application/octet-stream;
    sendfile       off;
    tcp_nopush     off;
    keepalive_timeout  0;
    gzip  on;

    server {
        listen       $appPort;
        server_name  0.0.0.0;
        location / {
            root   "$staticFiles";
            index  index.html;
        }
        if (\$request_method !~ ^(GET)$ ) {
          return 444;
        }
    }
}
END_OF_CUSTOM_NGINX_CONF

cleanupTmpServer() {
  printf '\n\nCaught interrupt for "%s" server on port %s...\n' \
    "$appName" "$appPort"

  printf '\tKilling nginx server, with EUID=0:\n'
  sudo nginx -c "$nginxConfig" -s stop

  printf '\tDeleting temp configuration in %s\n\n\n' "$nginxTmpDir"
  rm -rf "$nginxTmpDir"
  exit 0
}

printf '...Starting nginx with EUIDi=0\n'
if ! sudo nginx -c "$nginxConfig";then
  printf 'Failed to start nginx\n' >&2
  exit 4
fi

trap cleanupTmpServer 3 SIGINT
printf 'Serving "%s", port :%s,\n\tnginx conf in:\t%s\n\tstatic files from:\t%s\n' \
  "$appName" "$appPort" "$nginxTmpDir" "$staticFiles"
printf '\tInterrupt, or kill directly:\n\t\tsudo nginx -c "%s" -s stop\n' "$nginxConfig"
tail -f "$nginxTmpDir"/nginx.*.log
