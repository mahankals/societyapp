<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class AdminMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if (!isLoggedIn() || !isAdmin()) {
            \Session::flash('error', 'Access denied. Administrator privileges required.');
            $response = new SlimResponse();
            return $response->withHeader('Location', '/admin/login')->withStatus(302);
        }
        return $handler->handle($request);
    }
}
