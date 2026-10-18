<?php

namespace App\Core;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class SlimBridge
{
    /**
     * Wrap any controller action or closure to execute cleanly within Slim 4 PSR-7 pipeline.
     */
    public static function wrap($handler): \Closure
    {
        return function (Request $request, Response $response, array $args = []) use ($handler): Response {
            ob_start();
            try {
                if (!is_callable($handler)) {
                    error_log('SlimBridge error: handler is not callable! Type: ' . gettype($handler) . ' Value: ' . var_export($handler, true));
                    throw new \InvalidArgumentException('SlimBridge: handler must be callable');
                }

                $result = $handler(...array_values($args));
                $output = ob_get_clean();

                if ($result instanceof Response) {
                    return $result;
                }

                if (is_string($result)) {
                    $response->getBody()->write($result);
                    return $response;
                }

                if (is_array($result)) {
                    $response->getBody()->write(json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
                    return $response->withHeader('Content-Type', 'application/json');
                }

                if (!empty($output)) {
                    $response->getBody()->write($output);
                    return $response;
                }

                return $response;
            } catch (RedirectException $e) {
                ob_end_clean();
                return $response
                    ->withHeader('Location', $e->getUrl())
                    ->withStatus($e->getStatusCode());
            } catch (\Throwable $e) {
                ob_end_clean();
                throw $e;
            }
        };
    }
}
