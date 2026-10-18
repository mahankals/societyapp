<?php

use Slim\App;
use App\Core\SlimBridge;
use App\Controllers\ApiController;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * API Routes Registration
 *
 * @param App $app
 */
return function (App $app) {
    require_once APP_PATH . '/controllers/ApiController.php';
    $api = new ApiController();

    $app->group('/api', function ($group) use ($api) {
        // Status & Health
        $group->get('/status', function (Request $request, Response $response): Response {
            $data = [
                'status' => 'ok',
                'time' => date('c'),
                'service' => 'SocietyApp API',
                'version' => '2.0.0',
            ];
            $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Bootstrap App Data (Single roundtrip for React SPA)
        $group->get('/bootstrap', SlimBridge::wrap([$api, 'bootstrap']));

        // Authentication Endpoints
        $group->post('/auth/login', SlimBridge::wrap([$api, 'login']));
        $group->post('/auth/logout', SlimBridge::wrap([$api, 'logout']));
        $group->post('/auth/register', SlimBridge::wrap([$api, 'register']));
        $group->post('/user/switch-society', SlimBridge::wrap([$api, 'switchSociety']));

        // Admin Endpoints
        $group->get('/admin/dashboard', SlimBridge::wrap([$api, 'adminDashboard']));
        $group->get('/admin/societies', SlimBridge::wrap([$api, 'adminSocieties']));
        $group->get('/admin/societies/pending', SlimBridge::wrap([$api, 'adminPendingSocieties']));
        $group->get('/admin/users', SlimBridge::wrap([$api, 'adminUsers']));
        $group->get('/admin/invitations', SlimBridge::wrap([$api, 'adminInvitations']));
        $group->get('/admin/settings', SlimBridge::wrap([$api, 'adminSettings']));

        // Resident Endpoints
        $group->get('/resident/dashboard', SlimBridge::wrap([$api, 'residentDashboard']));
        $group->get('/resident/bills', SlimBridge::wrap([$api, 'residentBills']));
        $group->get('/resident/receipts', SlimBridge::wrap([$api, 'residentReceipts']));
        $group->get('/resident/members', SlimBridge::wrap([$api, 'residentMembers']));

        // Committee Endpoints
        $group->get('/committee/dashboard', SlimBridge::wrap([$api, 'committeeDashboard']));
        $group->get('/committee/flats', SlimBridge::wrap([$api, 'committeeFlats']));

        // Notifications Endpoints
        $group->get('/notifications', SlimBridge::wrap([$api, 'notifications']));
        $group->post('/notifications/mark-read', SlimBridge::wrap([$api, 'markNotificationsRead']));

        // Profile Endpoints
        $group->get('/profile', SlimBridge::wrap([$api, 'profile']));
        $group->post('/profile', SlimBridge::wrap([$api, 'updateProfile']));
    });
};
