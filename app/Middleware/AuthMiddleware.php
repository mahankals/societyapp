<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if (!isLoggedIn()) {
            $returnUrl = $request->getUri()->getPath();
            \Session::put('return_url', $returnUrl);
            $response = new SlimResponse();
            return $response->withHeader('Location', '/auth/login?return_url=' . urlencode($returnUrl))->withStatus(302);
        }
        return $handler->handle($request);
    }
}
