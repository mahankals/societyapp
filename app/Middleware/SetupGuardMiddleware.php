<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class SetupGuardMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        $path = $request->getUri()->getPath();
        $isSetupRoute = (strpos($path, '/setup') === 0)
            || (strpos($path, '/auth/google-callback') === 0)
            || (strpos($path, '/auth/google-one-tap') === 0);
        $isAsset = (bool)preg_match('/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|map)$/i', $path);

        if (!isAppSetupCompleted()) {
            if (\Session::has('user_id')) {
                \Session::forget('user_id');
                \Session::forget('role');
                \Session::forget('email');
            }
            if (!$isSetupRoute && !$isAsset) {
                $response = new SlimResponse();
                return $response->withHeader('Location', '/setup')->withStatus(302);
            }
        }

        return $handler->handle($request);
    }
}
