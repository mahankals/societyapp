<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class GuestMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if (isLoggedIn()) {
            $response = new SlimResponse();
            return $response->withHeader('Location', '/resident')->withStatus(302);
        }
        return $handler->handle($request);
    }
}
