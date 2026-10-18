<?php

use Slim\App;
use App\Core\SlimBridge;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * API Routes Registration
 *
 * @param App $app
 */
return function (App $app) {
    $app->group('/api', function ($group) {
        $group->get('/status', function (Request $request, Response $response): Response {
            $data = [
                'status' => 'ok',
                'time' => date('c'),
                'service' => 'SocietyApp API',
                'version' => '1.0.0',
            ];
            $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return $response->withHeader('Content-Type', 'application/json');
        });
    });
};
