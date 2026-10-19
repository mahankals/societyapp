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

        // Public / Contribution
        $group->post('/society/contribute', SlimBridge::wrap([$api, 'submitSocietyProposal']));
        $group->get('/society/my-proposals', SlimBridge::wrap([$api, 'mySocietyProposals']));
        $group->get('/society/contribute/search-user', SlimBridge::wrap([$api, 'searchUserForContribution']));

        // Admin Endpoints
        $group->get('/admin/dashboard', SlimBridge::wrap([$api, 'adminDashboard']));
        $group->get('/admin/societies', SlimBridge::wrap([$api, 'adminSocieties']));
        $group->get('/admin/societies/pending', SlimBridge::wrap([$api, 'adminPendingSocieties']));
        $group->post('/admin/societies/requests/{id}/approve', SlimBridge::wrap([$api, 'approveSocietyRequest']));
        $group->post('/admin/societies/requests/{id}/reject', SlimBridge::wrap([$api, 'rejectSocietyRequest']));
        $group->get('/admin/users', SlimBridge::wrap([$api, 'adminUsers']));
        $group->get('/admin/invitations', SlimBridge::wrap([$api, 'adminInvitations']));
        $group->get('/admin/settings', SlimBridge::wrap([$api, 'adminSettings']));

        // Resident Endpoints
        $group->get('/resident/dashboard', SlimBridge::wrap([$api, 'residentDashboard']));
        $group->get('/resident/bills', SlimBridge::wrap([$api, 'residentBills']));
        $group->get('/resident/receipts', SlimBridge::wrap([$api, 'residentReceipts']));
        $group->get('/resident/members', SlimBridge::wrap([$api, 'residentMembers']));
        $group->post('/resident/link-flat', SlimBridge::wrap([$api, 'requestLinkFlat']));
        $group->get('/resident/requests', SlimBridge::wrap([$api, 'residentRequests']));
        $group->post('/resident/flats/{id}/toggle-rent', SlimBridge::wrap([$api, 'toggleFlatRent']));
        $group->get('/resident/search-tenant', SlimBridge::wrap([$api, 'searchTenant']));
        $group->post('/resident/flats/{id}/assign-tenant', SlimBridge::wrap([$api, 'assignTenant']));
        $group->post('/resident/flats/{id}/remove-tenant', SlimBridge::wrap([$api, 'removeTenant']));
        $group->post('/resident/bills/pay', SlimBridge::wrap([$api, 'payResidentBills']));

        // Committee Endpoints
        $group->get('/committee/dashboard', SlimBridge::wrap([$api, 'committeeDashboard']));
        $group->get('/committee/flats', SlimBridge::wrap([$api, 'committeeFlats']));
        $group->post('/committee/flats', SlimBridge::wrap([$api, 'createCommitteeFlat']));
        $group->get('/committee/requests', SlimBridge::wrap([$api, 'committeeRequests']));
        $group->post('/committee/requests/{id}/approve', SlimBridge::wrap([$api, 'approveCommitteeRequest']));
        $group->post('/committee/bills', SlimBridge::wrap([$api, 'createBill']));
        $group->post('/committee/expenses', SlimBridge::wrap([$api, 'createExpense']));
        $group->get('/committee/reports', SlimBridge::wrap([$api, 'committeeReports']));

        // Notifications Endpoints
        $group->get('/notifications', SlimBridge::wrap([$api, 'notifications']));
        $group->post('/notifications/mark-read', SlimBridge::wrap([$api, 'markNotificationsRead']));

        // Profile Endpoints
        $group->get('/profile', SlimBridge::wrap([$api, 'profile']));
        $group->post('/profile', SlimBridge::wrap([$api, 'updateProfile']));
        $group->post('/profile/password', SlimBridge::wrap([$api, 'updatePassword']));
        $group->post('/profile/emergency', SlimBridge::wrap([$api, 'updateEmergency']));
        $group->post('/profile/pin', SlimBridge::wrap([$api, 'updatePin']));
        $group->post('/profile/disconnect-google', SlimBridge::wrap([$api, 'disconnectGoogle']));
        $group->post('/profile/photo', SlimBridge::wrap([$api, 'uploadPhoto']));
    });
};
