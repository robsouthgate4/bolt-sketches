import pymeshlab
import os
import numpy as np
import json
from json import JSONEncoder

class NumpyArrayEncoder(JSONEncoder):
	def default(self, obj):
		if isinstance(obj, np.ndarray):
			return obj.tolist()
		return JSONEncoder.default(self, obj)

def example_save_mesh():

	path = os.path.dirname(os.path.abspath(__file__))
	out_path = path

	ms = pymeshlab.MeshSet()

	ms.load_new_mesh(path + "/toy-ascii.ply")

	m = ms.current_mesh()
	arr = m.vertex_matrix()

	#print(arr)

	f = arr

	ms.clear()

	verts = []
	# loop over array
	for i in range(len(f)):
		a = f[i]
		# loop over each element in the array
		for j in range(len(a)):
			#round to 2 decimal places
			a[j] = round(a[j], 3)
		verts.append(a)

	nm = pymeshlab.Mesh(verts)

	ms.add_mesh( nm, "optim_mesh" )

	print(ms.number_meshes())


	# with open("numpyData.json", "w") as write_file:
	# 	json.dump(verts, write_file, cls=NumpyArrayEncoder)
	# 	print("Done writing serialized NumPy array into file")

	# print('Array exported to file')

	ms.save_current_mesh(out_path + '/toy-no-col-bin.ply',
		binary=True,
		save_vertex_normal=False,
		save_vertex_color=False,
		save_vertex_quality=False,
		save_face_color=False,
		save_face_quality=False,
	)


example_save_mesh()