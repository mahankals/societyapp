<?php

namespace App\Core;

use RuntimeException;

class RedirectException extends RuntimeException
{
    private string $url;
    private int $statusCode;

    public function __construct(string $url, int $statusCode = 302)
    {
        $this->url = $url;
        $this->statusCode = $statusCode;
        parent::__construct("Redirect to {$url}", $statusCode);
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}
