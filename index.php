<?php

error_reporting(0);

$mysqli = new mysqli('localhost', $user, $password, $db);

if ($mysqli->connect_errno) {
    echo 'Database down';
    die;
}

$mysqli->query('DELETE FROM pastes WHERE expiration < UTC_TIMESTAMP()');

$new_paste = true;

if (!empty($_POST)) {
    // include PBKDF2
    include 'PBKDF2.php';

    try {
        if (empty($_POST['paste_option'])) {
            throw new Exception('Option was not specified');
        }

        $stmt = $result = $error = $error_description = false;

        switch ($_POST['paste_option']) {
            case 'stats':
                $stats = $mysqli->prepare('SELECT * FROM stats LIMIT 1');
                if ($stats === false) {
                    throw new Exception('Prepared statement failed 1');
                }
                $stats->execute();

                // store result
                $pastes = $sizes = $views = $expirations = $burns = false;
                $stats->store_result();
                $stats->bind_result($id, $pastes, $views, $sizes, $expirations, $burns);
                
                if ($stats->num_rows > 0) {
                    while ($stats->fetch()) {
                        $result = array('pastes' => number_format($pastes),
                                        'sizes' => number_format($sizes) . ' bytes',
                                        'views' => number_format($views),
                                        'expirations' => number_format(round($expirations / $pastes, 0)) . ' minutes',
                                        'burns' => number_format($burns));
                    }
                    $stats->close();
               } else {
                    $error_description = 'Paste was not found';
                }
                
                break;
            case 'put':

                if (empty($_POST['paste_id']) || empty($_POST['paste_content']) || empty($_POST['paste_expiration']) || empty($_POST['paste_burn'])) {
                    throw new Exception('Input mismatch');
                }

                $id = base64_decode($_POST['paste_id']);
                $content = preg_replace('/[^a-zA-Z0-9\/\+\=]/', '', $_POST['paste_content']);
                $expiration = $_POST['paste_expiration'];
                $burn = $_POST['paste_burn'] === 'true' ? 1 : 0;

                if (strlen($content) > 65535) {
                    throw new Exception('Paste content can not exceed the size limit of 65535 bytes');
                }

                switch ($expiration) {
                    case '5m':
                        $expiration = '0 00:05:00';
                        break;
                    case '15m':
                        $expiration = '0 00:15:00';
                        break;
                    case '1h':
                        $expiration = '0 01:00:00';
                        break;
                    case '1w':
                        $expiration = '7 00:00:00';
                        break;
                    case '30m':
                        $expiration = '0 00:30:00';
                        break;
                    case '1d':
                    default:
                        $expiration = '1 00:00:00';
                        break;
                }

                $id = pbkdf2('sha256', $id, '', 65535, 32);

                $insert = $mysqli->prepare('INSERT INTO pastes (id, content, views, creation, expiration, burn) VALUES(?, ?, 0, UTC_TIMESTAMP(), ADDTIME(UTC_TIMESTAMP(), ?), ?)');
                if($insert === false) {
                    throw new Exception('Prepared statement failed');
                }

                $insert->bind_param('sssi', $id, $content, $expiration, $burn);
                $insert->execute();

                if ($insert->affected_rows > 0) {
                    $result = 'OK';
                    
                    $stats = $mysqli->prepare('UPDATE stats SET pastes = pastes + 1, sizes = sizes + ?, expirations = expirations + TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), ADDTIME(UTC_TIMESTAMP(), ?))');
                    if($stats === false) {
                        throw new Exception('Prepared statement failed');
                    }

                    $stats->bind_param('is', strlen($content), $expiration);
                    $stats->execute();
                    $stats->close();
                } else {
                    throw new Exception('Content can not be saved on database');
                }

                $insert->close();

                break;

            case 'get':

                if (empty($_POST['paste_id'])) {
                    throw new Exception('Input mismatch');
                }

                $id = base64_decode($_POST['paste_id']);
                $id = pbkdf2('sha256', $id, '', 65535, 32);

                $select = $mysqli->prepare("SELECT content, views, DATE_FORMAT(creation, '%Y-%m-%dT%TZ'), DATE_FORMAT(expiration, '%Y-%m-%dT%TZ'), burn FROM pastes WHERE id = ? LIMIT 1");
                if ($select === false) {
                    throw new Exception('Prepared statement failed 1');
                }

                $select->bind_param('s', $id);
                $select->execute();

                // store result
                $content = $views = $creation = $expiration = $burn = false;
                $select->store_result();
                $select->bind_result($content, $views, $creation, $expiration, $burn);
                
                if ($select->num_rows > 0) {
                    while ($select->fetch()) {
                        $result = array('content' => preg_replace('/[^a-zA-Z0-9\/\+\=]/', '', $content),
                                        'views' => $views + 1,
                                        'creation' => $creation,
                                        'expiration' => $expiration);
                    }
                    $select->close();
                    
                    $update = $mysqli->prepare('UPDATE pastes SET views = views + 1 WHERE id = ?');
                    if ($update === false) {
                        throw new Exception('Prepared statement failed 2');
                    }
                    $update->bind_param('s', $id);
                    $update->execute();
                    $update->close();
                    
                    $stats = $mysqli->prepare('UPDATE stats SET views = views + 1, burns = burns + ?');
                    if($stats === false) {
                        throw new Exception('Prepared statement failed');
                    }
                    $stats->bind_param('i', $burn);
                    $stats->execute();
                    $stats->close();
                    
                    if ($burn === 1) {
                        $delete = $mysqli->prepare('DELETE FROM pastes WHERE id = ?');
                        if ($delete === false) {
                            throw new Exception('Prepared statement failed 3');
                        }

                        $null = NULL;
                        $delete->bind_param('b', $null);
                        $delete->send_long_data(0, $id);
                        $delete->execute();
                        $delete->close();
                    }
                } else {
                    $error_description = 'Paste was not found';
                }

                break;
            default:
                $error_description = 'Invalid option';
                break;
        }
    } catch (Exception $e) {
        $error_description = $e->getMessage();
    }

    if (empty($error_description)) {
        $error = false;
    } else {
        $error = true;
    }

    echo json_encode(array('result' => $result, 'error' => $error, 'error_description' => $error_description));

    die;
}

include 'view.html';