<?php
/**
 * Router - Central routing system
 */

class Router {
    private array $routes = [];
    private array $middleware = [];

    public function get(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function any(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('ANY', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, callable $handler, array $middleware = []): void {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function middleware(string $name, callable $fn): void {
        $this->middleware[$name] = $fn;
    }

    public function dispatch(string $uri, string $method): void {
        $uri = rtrim($uri, '/');
        if ($uri === '') {
            $uri = '/';
        }

        $checkMethod = $method === 'HEAD' ? 'GET' : $method;

        foreach ($this->routes as $route) {
            if ($route['method'] !== 'ANY' && $route['method'] !== $checkMethod) {
                continue;
            }

            $pattern = $this->buildPattern($route['path']);
            if (preg_match($pattern, $uri, $matches)) {
                array_shift($matches);

                if (isset($route['middleware'])) {
                    foreach ($route['middleware'] as $mw) {
                        if (isset($this->middleware[$mw])) {
                            call_user_func($this->middleware[$mw]);
                        }
                    }
                }

                call_user_func($route['handler'], ...$matches);
                return;
            }
        }

        http_response_code(404);
        $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../views');
        $twig = new \Twig\Environment($loader, ['debug' => true]);
        echo $twig->render('errors/404.html.twig');
    }

    private function buildPattern(string $path): string {
        // {param+} = greedy wildcard (matches multiple segments including slashes)
        $path = preg_replace('/\{([a-zA-Z_]+)\+\}/', '(.+)', $path);
        // {param}  = single segment (no slashes)
        $path = preg_replace('/\{([a-zA-Z_]+)\}/', '([^/]+)', $path);
        return '#^' . $path . '$#';
    }

    public function group(string $prefix, callable $callback): void {
        $currentRoutes = $this->routes;
        $callback($this);
        $newRoutes = array_slice($this->routes, count($currentRoutes));
        foreach ($newRoutes as &$route) {
            $route['path'] = $prefix . $route['path'];
        }
        $this->routes = array_merge($currentRoutes, $newRoutes);
    }
}
