import unittest
from unittest.mock import patch
from server import parse_obj, approved_source

class InspectorTests(unittest.TestCase):
    def test_reads_real_obj_structure(self):
        obj=b"o chassis_col\no wheel_lf\no wheel_rf\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl body\nf 1 2 3\n"
        result=parse_obj(obj)
        self.assertEqual(result["materialCount"],1)
        self.assertTrue(result["collisionMeshDetected"])
        self.assertTrue(result["wheelRigDetected"])
        self.assertEqual(result["textureCount"],0)

    def test_rejects_invalid_geometry(self):
        with self.assertRaises(ValueError):
            parse_obj(b"o body\nv 0 0 0\nf 1 2 3\n")

    @patch.dict("os.environ", {"GTA_INSPECTOR_ALLOWED_HOSTS":"assets.example.com"})
    @patch("server.socket.getaddrinfo", return_value=[(None,None,None,None,("127.0.0.1",443))])
    def test_blocks_private_network(self,_):
        with self.assertRaises(ValueError):
            approved_source("https://assets.example.com/car.obj")

    @patch.dict("os.environ", {"GTA_INSPECTOR_ALLOWED_HOSTS":"assets.example.com"})
    def test_rejects_unlisted_host(self):
        with self.assertRaises(ValueError):
            approved_source("https://untrusted.example.com/car.obj")

if __name__=="__main__":
    unittest.main()
